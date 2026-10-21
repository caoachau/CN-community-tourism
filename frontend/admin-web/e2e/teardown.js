export default async function teardown(){
  try{await fetch('http://127.0.0.1:5005/__test/shutdown',{method:'POST'});}catch{/* Startup failure already cleaned its owned schema. */}
  // Allow the harness to dispose its schema before Playwright terminates helpers.
  for(let attempt=0;attempt<50;attempt++){
    try{await fetch('http://127.0.0.1:5005/api/health',{signal:AbortSignal.timeout(1000)});}catch{return;}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
}
