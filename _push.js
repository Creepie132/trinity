const {execSync} = require('child_process');
const fs = require('fs');
const dir = 'F:\\Amber_solutions_Kira\\Trinity';

// Remove temp files from git
['_build.js', '_build.log'].forEach(f => {
  try { fs.unlinkSync(dir + '\\' + f); } catch {}
});

execSync('git add -A', {cwd: dir, stdio: 'inherit'});
execSync('git commit -m "feat: apiFetch wrapper, migrate POST routes to structured errors, fix Gemini critique"', {cwd: dir, stdio: 'inherit'});
execSync('git push origin main', {cwd: dir, stdio: 'inherit'});
console.log('PUSHED');
