export {};
const smokeOrigin=process.env.APP_ORIGIN??"http://127.0.0.1:8787";for(const path of ["/","/privacy-policy","/api/health"]){const response=await fetch(`${smokeOrigin}${path}`);if(!response.ok)throw new Error(`${path}: ${response.status}`);console.log(`${path}: ${response.status}`);}
