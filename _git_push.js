const {execSync} = require('child_process');
process.chdir('F:\\Amber_solutions_Kira\\Trinity');
execSync('git add -A', {stdio: 'inherit'});
execSync('git commit -m "feat: demo limits 403 standard format, global interceptor, SPA keepPreviousData"', {stdio: 'inherit'});
execSync('git push origin main', {stdio: 'inherit'});
