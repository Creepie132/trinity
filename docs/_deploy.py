import subprocess, pathlib, os

cwd = 'F:/Amber_solutions_Kira/Trinity'

r = subprocess.run(
    ['git', 'add', 'src/app/(marketing)/landing/page.tsx'],
    capture_output=True, cwd=cwd
)
print('add:', r.returncode)

msg = "fix: hero reveal works without #main-scroll — root:null fallback + instant hero visibility"
pathlib.Path('F:/Amber_solutions_Kira/Trinity/docs/commit-msg.txt').write_text(msg, encoding='utf-8')

r2 = subprocess.run(['git', 'commit', '-F', 'docs/commit-msg.txt'], capture_output=True, cwd=cwd)
print('commit:', r2.stdout.decode('utf-8','replace').strip())

r3 = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, cwd=cwd)
print('push rc:', r3.returncode, r3.stderr.decode('utf-8','replace')[-150:])

os.remove('F:/Amber_solutions_Kira/Trinity/docs/commit-msg.txt')
os.remove('F:/Amber_solutions_Kira/Trinity/docs/_check.py')
print('done')
