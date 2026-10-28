import {readdir} from 'node:fs/promises';import {join,resolve} from 'node:path';import {spawn} from 'node:child_process';
const windows=process.platform==='win32',directory=`src-tauri/target/release/bundle/${windows?'nsis':'macos'}`;
const files=(await readdir(directory)).filter(name=>name.endsWith(windows?'.exe':'.app.tar.gz'));if(files.length!==1)throw Error('需要唯一当前平台更新包');
const child=spawn('cargo',['test','--release','--manifest-path','src-tauri/Cargo.toml','--lib','updater::tests::built_bundle_signature','--','--ignored'],{stdio:'inherit',env:{...process.env,VERIFY_REAL_BUNDLE:resolve(join(directory,files[0]))}});child.on('error',error=>{process.stderr.write(error.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
