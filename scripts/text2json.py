import os
import json
import re
import shutil
from bs4 import BeautifulSoup

# Directories
TXT_DIR = "./submissions/txt_files"
OUTPUT_DIR = "./submissions/structured"
MANUAL_DIR = "./submissions/manual"
LOG_FILE = "./compiled/manual_review.log"

PROCESSED_TXT_DIR = os.path.join(TXT_DIR, "processed")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(PROCESSED_TXT_DIR, exist_ok=True)
os.makedirs(MANUAL_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

manual_review_files = []

# Helper function to extract submission components from raw content
def parse_submission(content):
    try:
        protocol_present = "This submission was generated with protocol META-DP-EVAL-v1.3" in content
        dp_present = re.search(r"DP\d+ - ", content)

        if not (protocol_present or dp_present):
            clean_preview = re.sub(r"\s+", " ", content.strip())[:300]
            print(f"[DEBUG] Skipping due to missing protocol or DP tags. Clean preview:\n{clean_preview}")
            return None

        name_match = re.search(r"^\s*Name:\s*(.+)$", content, re.MULTILINE)
        last_name_match = re.search(r"^\s*Last name:\s*(.+)$", content, re.MULTILINE)
        email_match = re.search(r"^\s*Short answer email:\s*(.+)$", content, re.MULTILINE)
        title_match = re.search(r"^\s*Contribute an Idea:\s*(.+)$", content, re.MULTILINE)

        overview_match = re.search(r"Contribution Overview(.*?)(DP\d+|Clarifications & Extensions|https://|\Z)", content, re.DOTALL)
        source_match = re.search(r"https://[^\s]+", content)

        dp_block = re.search(r"Directly Addressed Desirable Properties:(.*?)(Clarifications & Extensions|\Z)", content, re.DOTALL)
        dp_lines = re.findall(r"(DP\d+ - [^:]+):\s*(.*?)\n(?=DP\d+ - |\Z)", dp_block.group(1) if dp_block else '', re.DOTALL)

        clar_ext_matches = re.findall(
            r"(DP\d+.*?)\nClarification: (.*?)\n\nWhy it matters: (.*?)\n|"
            r"(DP\d+.*?)\nExtension: (.*?)\n\nWhy it matters: (.*?)\n",
            content, re.DOTALL
        )

        submission = {
            "submitter": {
                "first_name": name_match.group(1).strip() if name_match else None,
                "last_name": last_name_match.group(1).strip() if last_name_match else None,
                "email": email_match.group(1).strip() if email_match else None
            },
            "submission": {
                "title": title_match.group(1).strip() if title_match else "Untitled",
                "overview": overview_match.group(1).strip() if overview_match else None,
                "source_link": source_match.group(0).strip() if source_match else None
            },
            "directly_addressed_dps": [
                {"dp": dp[0].strip(), "summary": dp[1].strip()} for dp in dp_lines
            ],
            "clarifications_and_extensions": []
        }

        for clar in clar_ext_matches:
            if clar[0]:
                dp_title, clar_title = clar[0].split(":", 1)
                submission["clarifications_and_extensions"].append({
                    "dp": dp_title.strip(),
                    "type": "Clarification",
                    "title": clar_title.strip(),
                    "clarification": clar[1].strip(),
                    "why_it_matters": clar[2].strip()
                })
            elif clar[3]:
                dp_title, ext_title = clar[3].split(":", 1)
                submission["clarifications_and_extensions"].append({
                    "dp": dp_title.strip(),
                    "type": "Extension",
                    "title": ext_title.strip(),
                    "extension": clar[4].strip(),
                    "why_it_matters": clar[5].strip()
                })

        return submission

    except Exception as e:
        print("Error parsing content:", e)
        return None

def write_submission_file(submission, filename):
    base_name = os.path.splitext(filename)[0]
    output_path = os.path.join(OUTPUT_DIR, f"{base_name}.json")
    with open(output_path, 'w') as out:
        json.dump(submission, out, indent=2)
    print(f"✔ Parsed: {base_name} — {submission['submission']['title']}")

def copy_to_manual(filename, path):
    shutil.copy(path, os.path.join(MANUAL_DIR, filename))
    print(f"⚠️  Manual review: {filename}")

# Process .txt files
for filename in os.listdir(TXT_DIR):
    if filename.endswith(".txt"):
        path = os.path.join(TXT_DIR, filename)
        with open(path, 'r') as file:
            content = file.read()
            submission = parse_submission(content)
            if submission:
                write_submission_file(submission, filename)
            else:
                manual_review_files.append(filename)
                copy_to_manual(filename, path)
        shutil.move(path, os.path.join(PROCESSED_TXT_DIR, filename))

# Log unprocessed files
if manual_review_files:
    with open(LOG_FILE, 'w') as log:
        for fname in manual_review_files:
            log.write(fname + '\n')

print("✅ Finished processing structured submissions.")
