import { put } from '@vercel/blob';
import { readFileSync } from 'fs';

const apkPath = 'F:\\Amber_solutions_Kira\\trinity-mobile\\build\\app\\outputs\\flutter-apk\\app-release.apk';
const buf = readFileSync(apkPath);
const result = await put('trinity-v2.7.1.apk', buf, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
console.log(result.url);
console.log('size:', (buf.length / 1024 / 1024).toFixed(1) + ' MB');
