import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:5005/api/v1';
async function api(request,path,{token,method='GET',body}={}){
  const response=await request.fetch(`${base}${path}`,{method,headers:token?{Authorization:`Bearer ${token}`}:{},...(body?{data:body}:{})});
  const payload=await response.json();expect(response.ok(),`${method} ${path}: ${payload.error?.code??response.status()}`).toBeTruthy();return payload.data;
}
async function frame(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function fill(page,name,value){
  const field=page.getByRole('textbox',{name:new RegExp(`^${name}( \\*)?$`)});
  await field.focus();await expect(field).toBeFocused();await frame(page);
  await field.fill(value);await frame(page);await expect(field).toHaveValue(value);
}
function changed(page,path,method='POST'){return page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1${path}`&&response.request().method()===method);}
async function saved(response){const r=await response;expect(r.ok()).toBeTruthy();return (await r.json()).data;}
async function back(page,nextHeading){
  await page.getByRole('button').filter({hasText:'Quay lại'}).or(page.getByRole('button',{name:/Quay lại/})).first().click();
  if(nextHeading==='Không gian hộ dân')await expect(page.getByText('Quản lý hoạt động',{exact:true})).toBeVisible();
  else await expect(page.getByRole('heading',{name:nextHeading,exact:true})).toBeVisible();
  await frame(page);
}

test('Flutter registers a customer, submits a household and room, then shows the approved room publicly',async({page,request})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:430,height:1400});
  await page.goto('http://127.0.0.1:5005/mobile/');
  await page.locator('flt-semantics-placeholder').evaluate(node=>node.click());
  await page.getByRole('button',{name:'Khám phá ngay',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cá nhân',exact:true})).toBeVisible({timeout:60000});
  await page.getByRole('button',{name:'Cá nhân',exact:true}).click();
  await page.getByRole('button',{name:'Tạo tài khoản khách thành viên',exact:true}).click();
  await fill(page,'Họ và tên','Gia đình Flutter kiểm thử');
  await fill(page,'Email',`flutter-${Date.now()}@example.invalid`);
  await fill(page,'Mật khẩu','An isolated Flutter UI acceptance password');
  let response=changed(page,'/auth/register');
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  const account=await saved(response);expect(account.user.role).toBe('CUSTOMER');
  await expect(page.getByRole('heading',{name:'Tạo tài khoản',exact:true})).not.toBeVisible();
  await page.getByRole('button',{name:'Mở hồ sơ hộ dân',exact:true}).click();
  await page.getByRole('button',{name:'Mở hồ sơ hộ dân',exact:true}).click();
  await fill(page,'Tên giới thiệu','Hộ Flutter kiểm thử');await fill(page,'Mô tả','Gia đình đón khách tham gia các hoạt động trong vườn và lưu trú.');
  await fill(page,'Địa chỉ','Ấp Bình Hòa, xã An Bình');await fill(page,'Địa phương','Vĩnh Long');await fill(page,'Số liên hệ','0901234567');
  response=changed(page,'/households');await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();
  let h=await saved(response);expect(h.household.approvalStatus).toBe('DRAFT');
  response=changed(page,'/households/me/submissions');await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();h=await saved(response);
  const admin=await api(request,'/auth/login',{method:'POST',body:{email:'ui-admin@example.invalid',password:'Isolated UI test administrator password'}});
  await api(request,`/admin/household-applications/${h.profile.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:h.profile.version,decision:'APPROVED'}});
  await page.getByRole('button',{name:'Tải lại hồ sơ và quyền',exact:true}).click();
  await page.getByRole('button',{name:/^Điểm phục vụ /}).click();
  await page.getByRole('button',{name:'Thêm điểm phục vụ',exact:true}).click();
  await fill(page,'Tên giới thiệu','Nhà vườn Flutter');await fill(page,'Mô tả','Điểm đón khách và tổ chức hoạt động cùng gia đình trong vườn.');
  await fill(page,'Địa chỉ','Ấp Bình Hòa, xã An Bình');await fill(page,'Địa phương','Vĩnh Long');await fill(page,'Số liên hệ','0901234567');
  response=changed(page,'/households/me/places');await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();let p=await saved(response);
  response=changed(page,`/households/me/places/${p.place.id}/submissions`);await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();p=await saved(response);
  await api(request,`/admin/place-submissions/${p.profile.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:p.profile.version,decision:'APPROVED'}});
  await back(page,'Điểm phục vụ');await back(page,'Không gian hộ dân');
  await page.getByRole('button',{name:/^Phòng lưu trú /}).click();await page.getByRole('button',{name:'Thêm phòng lưu trú',exact:true}).click();
  await fill(page,'Tên giới thiệu','Phòng Flutter hướng vườn');await fill(page,'Mô tả','Phòng nghỉ rộng rãi, thoáng mát, cung cấp theo từng đêm.');
  await page.getByRole('button',{name:/^Điểm lưu trú:/}).click();await page.getByRole('button',{name:/Nhà vườn Flutter/}).click();
  await fill(page,'Số khách tối đa mỗi phòng','4');await fill(page,'Giá một phòng / một đêm \\(VND\\)','420000');
  response=changed(page,'/households/me/rooms');await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();let r=await saved(response);
  expect(r.room.nightlyPriceVnd).toBe(420000);
  response=changed(page,`/households/me/rooms/${r.room.id}/submissions`);await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();r=await saved(response);
  await api(request,`/admin/room-submissions/${r.profile.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:r.profile.version,decision:'APPROVED'}});
  const published=await api(request,`/public/rooms/${r.room.id}`);expect(published.room.title).toBe('Phòng Flutter hướng vườn');
  await back(page,'Phòng lưu trú');await back(page,'Không gian hộ dân');
  await page.getByRole('button',{name:'Khám phá',exact:true}).click();await page.getByRole('button',{name:'Lưu trú',exact:true}).click();
  await page.getByRole('button',{name:/Xem chi tiết Phòng Flutter hướng vườn/}).click({position:{x:70,y:220}});
  await expect(page.getByRole('button',{name:'Đặt ngay',exact:true})).toBeVisible();
  await page.screenshot({path:'../../.cache/ui-audit/flutter-room-live.png'});
  expect(errors).toEqual([]);
});
