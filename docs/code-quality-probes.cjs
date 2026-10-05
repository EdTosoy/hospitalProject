// Historical pre-fix reproduction tool. Current regressions: backend test:e2e and frontend test:e2e.
// The repaired API intentionally rejects requests that this historical probe expected to accept.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.cwd() + '/apps/frontend/node_modules/@playwright/test');
const { Pool } = require(process.cwd() + '/apps/backend/node_modules/pg');
const api = 'http://localhost:3000';
const ui = 'http://localhost:3001';
const unique = randomUUID().slice(0,8);
const password = process.env.SEED_PASSWORD;
if (!new URL(process.env.DATABASE_URL).pathname.includes('test')) throw Error('Dedicated test DB required');
async function request(path, token, method = 'GET', body) {
  const response = await fetch(api + path, {method, headers: {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},body:body ? JSON.stringify(body) : undefined});
  return {status:response.status, body:await response.json()};
}
async function login(email, pass = password) {
  const response = await request('/auth/login', null, 'POST', {email,password:pass});
  assert.equal(response.status,201); return response.body;
}
(async () => {
  const pool = new Pool({connectionString:process.env.DATABASE_URL});
  const before = (await pool.query('SELECT count(*)::integer AS n FROM "AuditLog"')).rows[0].n;
  const admin = await login('admin@hospital.com');
  const doctor = await login('doctor@hospital.com');
  const staff = await login('frontdesk@hospital.com');
  const billing = await login('billing@hospital.com');
  const email = `quality-${unique}@example.test`;
  assert.equal((await request('/auth/register',null,'POST',{email,password,name:'Quality Patient'})).status,201);
  const patient = await login(email);
  const profile = await request('/patients',patient.access_token,'POST',{firstName:`Quality${unique}`,lastName:'Patient',dob:'1990-01-01',gender:'OTHER',phone:'09123456789'});
  assert.equal(profile.status,201);
  const patientId = profile.body.id;
  const createAppointment = () => request('/appointments',patient.access_token,'POST',{patientId,dateTime:new Date(Date.now()+86400000*4).toISOString(),reason:'Synthetic quality probe'});
  const visit = await createAppointment(); assert.equal(visit.status,201);
  assert.equal((await request(`/appointments/${visit.body.id}`,doctor.access_token,'PATCH',{status:'CONFIRMED'})).status,200);
  assert.equal((await request(`/appointments/${visit.body.id}`,doctor.access_token,'PATCH',{status:'COMPLETED'})).status,200);
  const terminalCancel = await request(`/appointments/${visit.body.id}`,patient.access_token,'PATCH',{status:'CANCELLED'});
  console.log(JSON.stringify({probe:'patient-cancels-completed-appointment',status:terminalCancel.status,result:terminalCancel.body.status}));
  const secondEmail = `quality-doctor-${unique}@example.test`;
  assert.equal((await request('/users',admin.access_token,'POST',{email:secondEmail,password,name:'Quality Doctor',role:'DOCTOR'})).status,201);
  const secondDoctor = await login(secondEmail);
  let bothClaimed = 0;
  for(let i=0;i<10;i++) {
    const appointment = await createAppointment(); assert.equal(appointment.status,201);
    const claims = await Promise.all([doctor,secondDoctor].map(account => request(`/appointments/${appointment.body.id}`,account.access_token,'PATCH',{status:'CONFIRMED'})));
    if(claims.every(response => response.status === 200)) bothClaimed++;
  }
  console.log(JSON.stringify({probe:'concurrent-doctor-claim',attempts:10,bothReceived200:bothClaimed}));
  const whitespace = await request('/appointments',patient.access_token,'POST',{patientId,dateTime:new Date(Date.now()+86400000*4).toISOString(),reason:'   '});
  console.log(JSON.stringify({probe:'whitespace-visit-reason',status:whitespace.status}));
  const empty = await request('/consult-notes',doctor.access_token,'POST',{patientId,doctorId:doctor.user.id});
  console.log(JSON.stringify({probe:'empty-SOAP-note',status:empty.status}));
  const overdue = await request('/billing',billing.access_token,'POST',{patientId,amount:17.125,description:`Quality overdue ${unique}`,status:'OVERDUE'});
  assert.equal(overdue.status,201);
  console.log(JSON.stringify({probe:'fractional-cent-bill',status:overdue.status,amount:overdue.body.amount}));
  const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
  try {
    async function pageFor(account) {
      const context = await browser.newContext();
      await context.addInitScript(({token,user}) => localStorage.setItem('auth-storage',JSON.stringify({state:{token,user},version:0})), {token:account.access_token,user:account.user});
      return context.newPage();
    }
    const billPage = await pageFor(billing);
    await billPage.goto(ui+'/dashboard/billing');
    const record = billPage.getByRole('article').filter({hasText:`Quality overdue ${unique}`});
    await record.waitFor();
    console.log(JSON.stringify({probe:'overdue-bill-UI',visible:true,markPaidButtons:await record.getByRole('button',{name:'Mark paid'}).count(),overdueFilter:await billPage.getByRole('combobox',{name:'Filter by status'}).locator('option[value="OVERDUE"]').count()}));
    const queuePage = await pageFor(doctor);
    let queueReads=0;
    queuePage.on('request',r=>{if(r.url()===api+'/queue' && r.method()==='GET') queueReads++;});
    await queuePage.goto(ui+'/dashboard/queue');
    await queuePage.getByRole('searchbox').waitFor();
    const initialReads = queueReads;
    assert.equal((await request('/queue/add-to-queue',staff.access_token,'POST',{patientId})).status,201);
    await queuePage.waitForTimeout(1200);
    const appeared = await queuePage.getByText(`Quality${unique} Patient`,{exact:true}).count();
    await queuePage.reload();
    await queuePage.getByText(`Quality${unique} Patient`,{exact:true}).waitFor();
    console.log(JSON.stringify({probe:'cross-session-queue-refresh',appearedBeforeReload:appeared>0,readsBeforeReload:queueReads-initialReads-1,appearedAfterReload:true}));
  } finally {await browser.close();}
  const after=(await pool.query('SELECT count(*)::integer AS n FROM "AuditLog"')).rows[0].n;
  console.log(JSON.stringify({probe:'audit-trail',newAuditRows:after-before}));
  await pool.end();
})().catch(error => {console.error('Probe failed:',error.message);process.exitCode=1;});
