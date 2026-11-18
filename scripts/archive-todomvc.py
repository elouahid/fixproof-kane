"""Archive one finished local TodoMVC comparison without running the browser or calling a model.

Usage: python scripts/archive-todomvc.py <run-uuid>
Only the recorded comparison JSON, process receipt, checked metadata and original result JPEGs are exported.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "evidence/todomvc"
CASE = "cases/todomvc-es5.json"
SOURCE = "targets/todomvc/candidate/view.js"
SIDES = ("baseline", "candidate")
SHA = r"[a-f0-9]{64}"
UUID = r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}"
DATE = r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z"
MUTATING_EXCEPTIONS = {"wait", "analyze", "assert"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def same_keys(obj, required, optional=()):
    require(isinstance(obj, dict) and set(required) <= obj.keys() <= set(required) | set(optional),
            "Unexpected or missing public JSON fields.")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def parse(data):
    def unique(pairs):
        result = dict(pairs)
        require(len(result) == len(pairs), "Duplicate JSON keys.")
        return result
    return json.loads(data, object_pairs_hook=unique)


def pretty(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()


def verify_build(frozen, target, side, candidate):
    # Both fixture generations have a recorded, byte-level asset manifest.
    # The candidate substitutes only its selected view.js in that set.
    if side == "candidate" and not candidate["stable"]:
        # An unstable source cannot establish this binding. The verbatim report
        # retains that status; the HTTP capture still identifies the served build.
        return
    fixtures = [frozen["initialTargets"]["baseline"]]
    revised = PUBLIC / "fixture-revision.json"
    if revised.is_file():
        receipt = parse(revised.read_bytes())
        require(receipt["caseSha256"] == frozen["caseSha256"], "Fixture receipt refers to a different case.")
        fixtures.append(receipt["builds"]["baseline"])
    possibilities = set()
    for fixture in fixtures:
        manifest = {k: fixture[k] for k in ("schema", "upstream", "adapterSha256", "files")}
        if side == "candidate":
            manifest["files"] = {**manifest["files"], "view.js": candidate["files"][0]["sha256"]}
        serialized = json.dumps(manifest, separators=(",", ":"), ensure_ascii=False).encode()
        possibilities.add("sha256-" + digest(serialized))
    require(target["version"] in possibilities, "Build does not match the recorded fixture assets and source.")


def expect_pattern(pattern, value):
    require(isinstance(value, str) and re.fullmatch(pattern, value), "Unexpected public field value.")


def local_node(args, data=None):
    result = subprocess.run(["node", *args], cwd=ROOT, input=data, capture_output=True, timeout=50)
    require(result.returncode == 0, "Local read-only Node/Kane evidence operation failed.")
    return result.stdout


def outcome(pair):
    if "incomplete" in pair:
        return "incomplete"
    return {("pass", "pass"): "passed in both versions", ("fail", "fail"): "remained broken",
            ("fail", "pass"): "corrected", ("pass", "fail"): "regressed"}[pair]


def result_reason(value, check):
    known = {
        "Kane timed out or was cancelled.", "Kane reported missing or invalid authentication.",
        "The Kane account has insufficient credits.", "Kane could not start or continue the browser run.",
        "Kane reported an upload failure.", "Kane did not emit a final result.",
        "Kane did not confirm upload to Test Manager.", "The sealed Kane evidence is missing or failed validation.",
        "The sealed browser actions and readouts do not substantiate all required observations.",
        "The Kane verdict and required observations do not establish this assertion.",
        "The tested version could not be confirmed after the browser run.",
        "The first browser action must be navigation to the tested URL.",
        "The procedure contains an unsuccessful action or ambiguous step order.",
        "The runner log does not confirm the required number of DOM clicks.",
    }
    counts = len(check["actionContract"])
    known.update(f"Action {i} must be a confirmed DOM click on {a['target']['name']}."
                 for i, a in enumerate(check["actionContract"], 1))
    require(value in known or re.fullmatch(rf"Expected {counts} actions after entry but recorded \d{{1,2}}\.", value),
            "Unrecognized failure reason. Review this value privately before exporting.")


def check_result(result, side, spec, target):
    required = "observations browserActions observationSource exitCode kaneCode verdict category version kaneVersion kaneCredits evidence upload logDirectory".split()
    same_keys(result, required, ["procedure", "reason"])
    require(result["verdict"] in {"pass", "fail", "incomplete"} and result["category"] in {
        "application", "execution", "authentication", "infrastructure", "upload", "evidence"}, "Invalid verdict/category.")
    require(result["version"] == target["version"] and result["logDirectory"] == f"{side}/{spec['id']}", "Mismatched result target.")
    require(result["observationSource"] in (None, "sealed browser action records"), "Unexpected source of observations.")
    require(result["upload"] in ("uploaded", "failed", "unknown") and
            (result["exitCode"] is None or type(result["exitCode"]) is int) and
            (result["kaneCode"] is None or type(result["kaneCode"]) is int), "Invalid run metadata.")
    if result["kaneVersion"] is not None:
        expect_pattern(r"\d+\.\d+\.\d+", result["kaneVersion"])
    credits = result["kaneCredits"]
    require(credits is None or (type(credits) in (int, float) and math.isfinite(credits) and credits >= 0), "Invalid credit meter.")
    observations = result["observations"]
    require(isinstance(observations, dict) and observations.keys() <= spec["observations"].keys(), "Unexpected readout.")
    for value in observations.values():
        require(value in ("0 items left", "1 item left", "2 items left"), "Unexpected public readout.")
    for action in result["browserActions"]:
        same_keys(action, {"type", "status"})
        require(action["type"] in MUTATING_EXCEPTIONS | {"click", "navigate", "refresh"} and
                action["status"] in {"success", "failed"}, "Unexpected recorded browser action.")
    for action, expected in zip(result.get("procedure", []), spec["actionContract"]):
        same_keys(action, {"step", "target", "type", "selector"})
        target_info = expected["target"]
        require(type(action["step"]) is int and action["type"] == "click" and action["target"] == target_info["name"],
                "Unexpected click metadata.")
        require(action["selector"] in permitted_selectors(target_info), "Unsupported confirmed selector.")
    require(len(result.get("procedure", [])) <= len(spec["actionContract"]), "Unexpected procedure length.")
    if "reason" in result:
        result_reason(result["reason"], spec)
    ev = result["evidence"]
    if ev is not None:
        same_keys(ev, {"path", "sha256"})
        require(ev["path"] == f"{side}/{spec['id']}/run.evidence", "Unexpected pack path.")
        expect_pattern(SHA, ev["sha256"])
    else:
        require(result["verdict"] == "incomplete", "Conclusive result lacks a pack.")


def permitted_selectors(target):
    name = json.dumps(target["name"], ensure_ascii=False)
    return {"#" + target["id"], *[f"internal:role=button[name={name}{suffix}]" for suffix in "is"]}


def public_clicks(log, spec):
    safe = {s for a in spec["actionContract"] for s in permitted_selectors(a["target"])}
    for text in ["Mark all as complete", "Alpha"]:
        for suffix in "is":
            safe.add(f'internal:text="{text}"{suffix}')
            safe.add(f'internal:role=checkbox[name="{text}"{suffix}]')
    safe.update({".toggle-all-label", ".toggle", "input.toggle", "#master-toggle", "#alpha-toggle"})
    clicks = []
    step = None
    for line in log.splitlines():
        start = re.fullmatch(r"\[BrowserRunner\] Starting-Node: (\S+) Step: (\d+)", line)
        if start:
            step = int(start[2]) if start[1] == "dom_action" else None
        executed = re.fullmatch(r"\[BrowserRunner\] DOM Action: Clicked via DOM locator: (.+) — success", line)
        if executed:
            selector = executed[1]
            require(selector in safe, "Unreviewed DOM selector in the private pack. Inspect before export.")
            clicks.append({"step": step, "selector": selector})
    return clicks


def meter(run, result):
    events = []
    for line in (run / result["logDirectory"] / "run.ndjson").read_bytes().splitlines():
        if line.startswith(b"{"):
            event = parse(line)
            if event.get("type") == "run_end":
                events.append(event)
    if not events:
        require(result["kaneCredits"] is None, "Missing source for recorded credits.")
        return None
    require(len(events) == 1, "Ambiguous Kane run_end.")
    event = events[0]
    credits = event.get("credits_consumed", event.get("credits"))
    require(credits == result["kaneCredits"] and event.get("result_code") == result["kaneCode"], "Kane run_end mismatch.")
    return credits


def audit_pack(run, cli, side, spec, result, target, files, images):
    entry = {"side": side, "checkId": spec["id"], "verdict": result["verdict"], "kaneCredits": meter(run, result)}
    evidence = result["evidence"]
    if not evidence:
        return entry
    pack = run / evidence["path"]
    require(digest(pack.read_bytes()) == evidence["sha256"], "Kane pack digest mismatch.")
    validated = parse(local_node([str(cli), "evidence", "validate", str(pack), "--json"]))
    require(validated.get("valid") is True and validated.get("status") == "finalized", "Kane L1 validation failed.")
    entry.update({"packSha256": evidence["sha256"], "l1Status": "valid, finalized"})
    with ZipFile(pack) as archive:
        def log(suffix):
            members = [s for s in archive.namelist() if s.endswith("/logs/"+suffix)]
            require(len(members) == 1, "Ambiguous pack log.")
            return archive.read(members[0])
        actions = [parse(line) for line in log("0-actions.ndjson").splitlines() if line.strip()]
        runner = log("0-run.log").decode()
        entry["executedDomClicks"] = public_clicks(runner, spec)
        documents = []
        for response in parse(log("0-network.har"))["log"]["entries"]:
            request, res = response["request"], response["response"]
            headers = {h["name"].lower(): h["value"] for h in res["headers"]}
            if res["status"] == 200:
                require(request["url"].startswith(target["url"]) and request["method"] == "GET" and
                        headers.get("x-fixproof-version") == target["version"],
                        "A successful browser resource came from an unexpected build.")
            if "text/html" not in headers.get("content-type", ""):
                continue
            require(request["url"] == target["url"] and request["method"] == "GET" and res["status"] == 200
                    and headers.get("x-fixproof-version") == target["version"], "Unexpected HTML document in Kane HAR.")
            documents.append({"status": 200, "version": target["version"]})
        entry["documentResponses"] = documents
        if result["verdict"] == "incomplete":
            return entry
        require(documents, "Conclusive result lacks a matching HTTP document.")
        verified = parse(local_node(["--input-type=module", "-e",
            "import{readFileSync}from'node:fs';import{inspectBrowserActions}from'./lib/assertions.mjs';"
            "console.log(JSON.stringify(inspectBrowserActions(JSON.parse(readFileSync(0,'utf8')))))"],
            pretty({"actions":actions,"runnerLog":runner,"check":spec,"url":target["url"],
                    "status":"passed" if result["verdict"] == "pass" else "failed"})))
        require(isinstance(verified, dict) and verified.get("observations") == result["observations"]
                and verified.get("procedure") == result.get("procedure") and verified.get("actions") == result["browserActions"],
                "The original evidence validator does not confirm the report.")
        last_input = max(a["step"] for a in actions if a["action_type"] not in MUTATING_EXCEPTIONS)
        frames = []
        for member in archive.namelist():
            match = re.search(r"/steps/(\d+)-(\d+)-(\d+)/screenshot\.jpg$", member)
            if match and int(match[1]) > last_input:
                frames.append((tuple(map(int, match.groups())), member))
        require(frames, "No original screenshot recorded after the last mutating action.")
        step, member = max(frames)
        image = archive.read(member)
        require(image.startswith(b"\xff\xd8\xff") and image.endswith(b"\xff\xd9")
                and not any(token in image for token in (b"Exif\x00\x00", b"Photoshop", b"http://ns.adobe", b"\xff\xfe")),
                "Review nonstandard JPEG metadata privately.")
        filename = f"{side}-{spec['id']}.jpg"
        files[filename] = image
        images.append({"side": side, "checkId": spec["id"], "file": filename, "sha256": digest(image)})
        entry["screenshotPackStep"] = "-".join(map(str, step))
    return entry


def archive(run_id):
    expect_pattern(UUID, run_id)
    run = ROOT / ".fixproof/runs" / run_id
    files = {f: (run/f).read_bytes() for f in ["report.json", "process-capture.json"]}
    report, capture = [parse(b) for b in files.values()]
    frozen = parse((PUBLIC/"freeze.json").read_bytes())
    case_bytes = (run/"case.json").read_bytes()
    case = parse(case_bytes)
    require(digest(case_bytes) == frozen["caseSha256"] == report["specSha256"] == capture["caseSha256"]
            and case["title"] == report["title"], "Case differs from its freeze.")
    same_keys(report, "schemaVersion caseSchemaVersion id title startedAt finishedAt specSha256 targets checks candidateSource".split())
    same_keys(capture, "command id startedAt finishedAt comparisonExitCode signal reportSha256 caseSha256 provenance".split())
    require(capture["command"] == ["node","compare.mjs",CASE,"--candidate-source",SOURCE] and capture["signal"] is None and
            capture["provenance"] == "Exit code from the Node child process that ran compare.mjs for this report.", "Unexpected process capture metadata.")
    require(report["id"] == capture["id"] == run_id and capture["reportSha256"] == digest(files["report.json"]) and
            report["schemaVersion"] == report["caseSchemaVersion"] == 2, "Mismatched report and process receipt.")
    for doc in (report, capture):
        for key in ("startedAt", "finishedAt"):
            expect_pattern(DATE, doc[key])
    same_keys(report["targets"], SIDES)
    candidate = report["candidateSource"]
    same_keys(candidate, {"files","stable"})
    require(type(candidate["stable"]) is bool and len(candidate["files"]) == 1, "Unexpected source records.")
    tracked = candidate["files"][0]
    same_keys(tracked, {"path","sha256"})
    require(tracked["path"] == SOURCE, "Unexpected source path.")
    expect_pattern(SHA, tracked["sha256"])
    for side in SIDES:
        target = report["targets"][side]
        same_keys(target, {"url", "version"})
        require(target["url"] == case[side+"Url"] == f"http://127.0.0.1:8771/{side}/", "Unexpected URL.")
        expect_pattern("sha256-"+SHA,target["version"])
        verify_build(frozen, target, side, candidate)
    checks = [case["behavior"], *case["controls"]]
    objective_hashes = parse(local_node(["--input-type=module","-e",
        "import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{objectiveFor}from'./lib/objective.mjs';"
        "console.log(JSON.stringify(JSON.parse(readFileSync(0,'utf8')).map(c=>createHash('sha256').update(objectiveFor(c)).digest('hex'))))"],
        pretty(checks)))
    cli_root = local_node(["--input-type=module","-e","import{resolveKaneRoot}from'./lib/kane.mjs';console.log(resolveKaneRoot()??'')"]).decode().strip()
    require(cli_root, "Kane CLI must be installed for local pack validation.")
    cli = Path(cli_root)/"bin/kane-cli.cjs"
    entries, images = [], []
    for spec, check, obj_hash in zip(checks, report["checks"], objective_hashes, strict=True):
        same_keys(check, "id expected objectiveSha256 outcome observationLabels baseline candidate".split())
        require(check["id"] == spec["id"] and check["expected"] == spec["expected"] and check["objectiveSha256"] == obj_hash
                and check["observationLabels"] == {k:v.get("label", k) for k,v in spec["observations"].items()}, "Check differs from case.")
        for side in SIDES:
            result, target = check[side], report["targets"][side]
            check_result(result, side, spec, target)
            entries.append(audit_pack(run, cli, side, spec, result, target, files, images))
        require(check["outcome"] == outcome(tuple(check[side]["verdict"] for side in SIDES)), "Contradictory check outcome.")
    expected_exit = 2 if any(c["outcome"] == "incomplete" for c in report["checks"]) else int(any(c["candidate"]["verdict"] == "fail" for c in report["checks"]))
    require(type(capture["comparisonExitCode"]) is int and capture["comparisonExitCode"] == expected_exit, "Captured exit conflicts with saved verdicts.")
    files["screenshots.json"] = pretty({"reportSha256": capture["reportSha256"], "images": images})
    files["audit.json"] = pretty({"runId": run_id, "reportSha256": capture["reportSha256"],
        "processCaptureSha256": digest(files["process-capture.json"]), "caseSha256": report["specSha256"],
        "checks": entries, "creditSource":"Kane run_end meter for each browser check. A missing meter is null."})
    destination = PUBLIC/"runs"/run_id
    if destination.exists():
        require({p.name:p.read_bytes() for p in destination.iterdir()} == files, "Archived run already exists with different bytes.")
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(dir=destination.parent) as temp:
            staged = Path(temp)/run_id
            staged.mkdir()
            for name, data in files.items():
                (staged/name).write_bytes(data)
            os.rename(staged, destination)
    print(f"{destination.relative_to(ROOT).as_posix()} · {len(images)} original result images · captured exit {expected_exit}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_id")
    archive(parser.parse_args().run_id)
