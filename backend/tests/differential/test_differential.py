"""Differential tests: the Python rules against the V1 TypeScript (tag v1-final), run with Node.

Skipped if git or node is missing, unless REQUIRE_DIFFERENTIAL=1 (CI) makes a skip a failure.
"""

import json
import os
import random
import shutil
import subprocess
from pathlib import Path

import pytest

from app.calc.payment import calculate_loan
from app.calc.validate import Invalid, validate_inputs

SEED = 20261022
REPO = Path(__file__).resolve().parents[3]

DRIVER = """
import { calculateLoan } from './payment.ts';
import { validateInputs } from './validate.ts';
import { readFileSync } from 'node:fs';

const cases = JSON.parse(readFileSync(0, 'utf8'));
const out = cases.map((c) =>
  c.kind === 'loan'
    ? calculateLoan({ loan: c.loan, annualRatePercent: c.rate, months: c.months })
    : validateInputs({ loan: c.loan, rate: c.rate, years: c.years }),
);
console.log(JSON.stringify(out));
"""


def _unavailable(reason: str):
    if os.environ.get("REQUIRE_DIFFERENTIAL") == "1":
        pytest.fail(reason)
    pytest.skip(reason)


@pytest.fixture(scope="module")
def v1_dir(tmp_path_factory):
    if shutil.which("git") is None or shutil.which("node") is None:
        _unavailable("git and node are needed for the differential tests")
    directory = tmp_path_factory.mktemp("v1")
    for name in ("payment", "validate"):
        shown = subprocess.run(
            ["git", "show", f"v1-final:src/calc/{name}.ts"],
            cwd=REPO,
            capture_output=True,
            text=True,
        )
        if shown.returncode != 0:
            _unavailable(f"git tag v1-final is not available: {shown.stderr.strip()}")
        (directory / f"{name}.ts").write_text(shown.stdout)
    (directory / "run.mjs").write_text(DRIVER)
    return directory


def run_v1(directory, cases):
    done = subprocess.run(
        ["node", "--no-warnings", "run.mjs"],
        cwd=directory,
        input=json.dumps(cases),
        capture_output=True,
        text=True,
    )
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


def test_differential_python_matches_v1_typescript(v1_dir):
    rng = random.Random(SEED)
    cases = []
    for _ in range(300):
        loan_cents = int(10 ** rng.uniform(5, 9))
        loan_cents = min(max(loan_cents, 100_000), 1_000_000_000)
        rate_hundredths = 0 if rng.random() < 0.05 else rng.randint(0, 2500)
        months = rng.randint(1, 480)
        cases.append((loan_cents, rate_hundredths, months))

    results = run_v1(
        v1_dir,
        [
            {"kind": "loan", "loan": loan / 100, "rate": rate / 100, "months": months}
            for loan, rate, months in cases
        ],
    )

    for (loan, rate, months), v1 in zip(cases, results, strict=True):
        python = calculate_loan(loan, rate, months)
        assert (
            python.monthly_payment_cents,
            python.total_paid_cents,
            python.total_interest_cents,
        ) == (
            round(v1["monthlyPayment"] * 100),
            round(v1["totalPaid"] * 100),
            round(v1["totalInterest"] * 100),
        ), (loan, rate, months)


WHITESPACE_SAMPLES = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    " ",
    "\t",
    "\u00a0",
    "\ufeff",
    "\u2003",
    "\u001c",
    "\u0085",
]
TRICKY = [
    "", "abc", "1e3", ".5", "5.", "+5", "1,000", "-0", "00100", "1.2.3", "０１２", "-5", "007",
    "9" * 30, "0" * 30 + "1000", "NaN", "Infinity", "0x10", "1 000", "-", "3,75", "1000.5000000000",
]  # fmt: skip


def random_field(rng, low, high, decimals):
    kind = rng.random()
    if kind < 0.85:
        value = rng.randint(low * 10**decimals, high * 10**decimals)
        text = f"{value / 10**decimals:.{decimals}f}" if decimals else str(value)
        if decimals and rng.random() < 0.3:
            text = text.rstrip("0").rstrip(".")
    elif kind < 0.9:
        text = rng.choice(TRICKY)
    elif kind < 0.95:
        text = str(rng.choice([low - 1, high + 1, 0, -1, high * 10]))
    else:
        text = f"{rng.randint(low, high)}.{rng.randint(0, 9999)}"
    return rng.choice(WHITESPACE_SAMPLES) + text + rng.choice(WHITESPACE_SAMPLES)


def test_differential_validation_matches_v1_typescript(v1_dir):
    rng = random.Random(SEED)
    cases = [
        {
            "kind": "validate",
            "loan": random_field(rng, 1000, 10_000_000, 2),
            "rate": random_field(rng, 0, 25, 2),
            "years": random_field(rng, 1, 40, 0),
        }
        for _ in range(400)
    ]
    results = run_v1(v1_dir, cases)

    for case, v1 in zip(cases, results, strict=True):
        python = validate_inputs(case["loan"], case["rate"], case["years"])
        if v1["ok"]:
            assert not isinstance(python, Invalid), case
            value = python.value
            assert value.loan_cents == round(v1["value"]["loan"] * 100), case
            assert value.annual_rate_hundredths == round(v1["value"]["annualRatePercent"] * 100), (
                case
            )
            assert value.term_months == v1["value"]["months"], case
        else:
            assert isinstance(python, Invalid), case
            names = {"loan": "loan", "rate": "annual_rate_percent", "years": "term_years"}
            expected = {names[field]: message for field, message in v1["errors"].items()}
            assert python.errors == expected, case
