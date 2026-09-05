import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "medlens.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
counts = {}
for t in tables:
    counts[t] = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
conn.close()

print("PRODUCTION DATABASE TABLE COUNTS:")
for t, c in counts.items():
    print(f"  {t}: {c}")

clinical_tables = ['patients', 'medical_reports', 'lab_results', 'patient_summaries']
clinical_total = sum(counts.get(t, 0) for t in clinical_tables)
print(f"TOTAL CLINICAL RECORDS: {clinical_total}")
assert clinical_total == 0, f"Expected 0 clinical records in production database, found {clinical_total}!"
print("DATABASE IS COMPLETELY CLEAN (0 CLINICAL RECORDS).")
