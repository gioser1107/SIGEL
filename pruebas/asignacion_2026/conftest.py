import json
import sys
import os
import re
from pathlib import Path
import pytest

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'backend'))
import main

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == 'call':
        ruta = Path(os.environ.get('SIGEL_QA_SALIDA', str(Path(__file__).parent))) / 'evidencias' / 'casos.jsonl'
        ruta.parent.mkdir(parents=True, exist_ok=True)
        detalle = re.sub(r'eyJ[A-Za-z0-9_.-]+', 'TOKEN_OMITIDO', str(report.longrepr)) if report.failed else ''
        with ruta.open('a') as f:
            f.write(json.dumps({'caso':item.name,'resultado':report.outcome,'segundos':report.duration, 'detalle':detalle},ensure_ascii=False)+'\n')
