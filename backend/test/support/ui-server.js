// Dedicated UI acceptance server. It can only use the owned test harness database.
// Never load backend/.env or createDatabase(): neither migrations nor fixtures run on Aiven.
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mysql from 'mysql2/promise';
import {createTestDatabase} from './mysql.js';
import {testDatabaseOptions,HarnessError} from './config.js';
import {databaseAccess} from '../../src/database.js';
import {createApp} from '../../src/app.js';
import {createAuthRepository} from '../../src/auth/repository.js';
import {createAuthService} from '../../src/auth/service.js';
import {authOptions} from '../../src/config/auth.js';
import {hashPassword} from '../../src/auth/passwords.js';
import {createHouseholdRepository} from '../../src/households/repository.js';
import {createHouseholdService} from '../../src/households/service.js';
import {createCatalogRepository} from '../../src/catalog/repository.js';
import {createCatalogService} from '../../src/catalog/service.js';
import {createServiceRepository} from '../../src/services/repository.js';
import {createServiceService} from '../../src/services/service.js';
import {createRoomRepository} from '../../src/rooms/repository.js';
import {createRoomService} from '../../src/rooms/service.js';
import {createContentRepository} from '../../src/content/repository.js';
import {createContentService} from '../../src/content/service.js';
import {createImageStorage} from '../../src/content/storage.js';
import {createLogger} from '../../src/shared/logger.js';

if(process.env.NODE_ENV!=='test')throw new Error('UI acceptance server requires NODE_ENV=test');
let database,pool,server,mediaDirectory;
try {
  database=await createTestDatabase(process.env,{schema:'survey'});
  pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8});
  const access=databaseAccess(pool),authRepository=createAuthRepository(access);
  const passwordHash=await hashPassword('Isolated UI test administrator password');
  await authRepository.transaction(tx=>tx.createUser({email:'ui-admin@example.invalid',displayName:'Admin kiểm thử',passwordHash,role:'ADMIN'}));
  const authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(48).toString('base64url')})});
  mediaDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'ctp-ui-media-'));
  const app=createApp({authService,logger:createLogger({env:{LOG_LEVEL:'silent'}}),allowedOrigins:['http://127.0.0.1:5177','http://localhost:5177','http://127.0.0.1:5005'],
    contentService:createContentService({repository:createContentRepository(access),storage:createImageStorage({NODE_ENV:'test',MEDIA_STORAGE_DIR:mediaDirectory})}),
    householdService:createHouseholdService({repository:createHouseholdRepository(access)}),catalogService:createCatalogService({repository:createCatalogRepository(access)}),
    serviceService:createServiceService({repository:createServiceRepository(access)}),roomService:createRoomService({repository:createRoomRepository(access)})});
  const root=path.resolve(fileURLToPath(new URL('../../../.cache/ui-e2e/mobile/',import.meta.url)));
  const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf','.otf':'font/otf','.png':'image/png','.jpg':'image/jpeg','.css':'text/css'};
  server=createServer(async(req,res)=>{
    if(req.url==='/__test/shutdown'&&req.method==='POST'){res.end('stopping');setImmediate(()=>stop());return;}
    if(!req.url.startsWith('/mobile/'))return app(req,res);
    try {
      const url=new URL(req.url,'http://localhost'),file=path.resolve(root,`.${decodeURIComponent(url.pathname.slice('/mobile'.length))}`);
      if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      const target=(await fs.stat(file)).isDirectory()?path.join(file,'index.html'):file;
      res.setHeader('Content-Type',mime[path.extname(target)]??'application/octet-stream');res.end(await fs.readFile(target));
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5005,'127.0.0.1',resolve);});
  console.log('Isolated UI test API ready at http://127.0.0.1:5005');
}catch(error){console.error('UI test server failed to start:',error instanceof HarnessError?error.code:error.code==='EADDRINUSE'?'TEST_PORT_IN_USE':'TEST_SERVER_START_FAILED');await pool?.end();await database?.dispose();process.exitCode=1;}
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await new Promise(resolve=>server?server.close(resolve):resolve());await pool?.end();await database?.dispose();if(mediaDirectory)await fs.rm(mediaDirectory,{recursive:true,force:true});process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
