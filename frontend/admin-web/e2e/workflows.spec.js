import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:5005/api/v1';
const password='An isolated customer password for UI acceptance';
const imageBytes=Buffer.from('UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+82mX/mwIGaH0wf+mkeNI8aR8poAA','base64');
async function call(request,path,{token,method='GET',body}={}){
  const response=await request.fetch(`${base}${path}`,{method,headers:token?{Authorization:`Bearer ${token}`}:{},...(body?{data:body}:{})});
  const payload=await response.json();expect(response.ok(),`${method} ${path}: ${payload.error?.code??response.status()}`).toBeTruthy();return payload.data;
}
async function customer(request){return call(request,'/auth/register',{method:'POST',body:{email:`ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`,displayName:'Chủ hộ kiểm thử',password}});}
async function loginAdmin(page){await page.goto('/');await page.getByLabel('Email',{exact:false}).fill('ui-admin@example.invalid');await page.getByLabel('Mật khẩu',{exact:false}).first().fill('Isolated UI test administrator password');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Hộ dân',exact:true})).toBeVisible();}
async function approve(page,tab,title){await page.getByRole('navigation',{name:'Điều hướng quản trị'}).getByRole('button',{name:tab,exact:true}).click();await page.getByRole('button',{name:'Tải lại',exact:true}).click();const row=page.getByRole('row').filter({has:page.getByText(title,{exact:true})});await expect(row).toBeVisible();await row.getByRole('button',{name:/Xem hồ sơ/}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Phiên bản được gửi'})).toBeVisible();await dialog.getByRole('button',{name:'Duyệt phiên bản này'}).click();await expect(dialog).not.toBeVisible();await expect(row).not.toBeVisible();}

test('Admin reviews household, place, room and all service pricing types; edits categories and blocks/unblocks an account',async({page,request})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await loginAdmin(page);
  const account=await customer(request),token=account.accessToken;
  let h=await call(request,'/households',{token,method:'POST',body:{title:'Hộ Nhà Vườn UI',body:'Gia đình cung cấp nhiều trải nghiệm gắn với cộng đồng địa phương.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}}});
  await call(request,'/households/me/submissions',{token,method:'POST',body:{revisionId:h.profile.revisionId,version:h.profile.version}});await approve(page,'Hộ dân','Hộ Nhà Vườn UI');
  expect((await call(request,'/auth/me',{token})).user.role).toBe('HOUSEHOLD');

  await page.getByRole('navigation',{name:'Điều hướng quản trị'}).getByRole('button',{name:'Danh mục',exact:true}).click();await page.getByRole('button',{name:'Thêm danh mục'}).click();
  let dialog=page.getByRole('dialog');await dialog.getByLabel('Mã danh mục').fill('UI_EXPERIENCE');await dialog.getByLabel('Tên danh mục').fill('Trải nghiệm qua giao diện');await dialog.getByLabel('Lý do thay đổi').fill('Tạo danh mục để kiểm chứng luồng giao diện');await dialog.getByRole('button',{name:'Lưu danh mục'}).click();await expect(dialog).not.toBeVisible();
  const categoryRow=page.getByRole('row').filter({hasText:'UI_EXPERIENCE'});await categoryRow.getByRole('button',{name:/Chỉnh sửa/}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Tên danh mục').fill('Trải nghiệm địa phương UI');await dialog.getByLabel('Lý do thay đổi').fill('Điều chỉnh tên rõ nghĩa');await dialog.getByRole('button',{name:'Lưu danh mục'}).click();await expect(dialog).not.toBeVisible();
  const category=(await call(request,'/public/categories?kind=SERVICE')).items.find(row=>row.code==='UI_EXPERIENCE');expect(category.name).toBe('Trải nghiệm địa phương UI');

  let p=await call(request,'/households/me/places',{token,method:'POST',body:{title:'Nhà vườn UI',body:'Điểm đón khách, cung cấp hoạt động và lưu trú trong vườn.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}}});
  await call(request,`/households/me/places/${p.place.id}/submissions`,{token,method:'POST',body:{revisionId:p.profile.revisionId,version:p.profile.version}});await approve(page,'Điểm phục vụ','Nhà vườn UI');
  let r=await call(request,'/households/me/rooms',{token,method:'POST',body:{title:'Phòng Hoa Sen UI',body:'Phòng nghỉ hướng vườn, phục vụ từng phòng theo đêm.',placeId:p.place.id,maxGuests:4,nightlyPriceVnd:400000,checkInTime:'14:00',checkOutTime:'12:00'}});
  await call(request,`/households/me/rooms/${r.room.id}/submissions`,{token,method:'POST',body:{revisionId:r.profile.revisionId,version:r.profile.version,pricingToken:r.room.pricingToken}});await approve(page,'Phòng lưu trú','Phòng Hoa Sen UI');
  expect((await call(request,`/public/rooms/${r.room.id}`)).room.nightlyPriceVnd).toBe(400000);

  let s=await call(request,'/households/me/services',{token,method:'POST',body:{title:'Trải nghiệm bắt cá UI',body:'Khách cùng gia đình tìm hiểu giăng lưới và thu hoạch cá.',categoryId:category.id,defaultPlaceId:p.place.id,defaultDurationMinutes:120}});
  for(const pricingType of ['PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT'])await call(request,`/households/me/services/${s.service.id}/offers`,{token,method:'POST',body:{name:`Phương thức ${pricingType}`,participationMode:pricingType==='PER_TRIP'?'EXCLUSIVE':'SHARED',pricingType,unitPriceVnd:150000,minParticipants:1,maxParticipants:5,terms:{scopeDescription:'Phục vụ đầy đủ hoạt động trong trọn lịch đã chọn.'},...(pricingType==='PER_UNIT'?{unitLabel:'xe',maxUnits:5,participantsPerUnit:1}:{})}});
  s=await call(request,`/households/me/services/${s.service.id}`,{token});await call(request,`/households/me/services/${s.service.id}/submissions`,{token,method:'POST',body:{revisionId:s.profile.revisionId,version:s.profile.version,offersToken:s.offersToken}});await approve(page,'Dịch vụ / trải nghiệm','Trải nghiệm bắt cá UI');
  expect((await call(request,`/public/services/${s.service.id}`)).service.offers).toHaveLength(6);

  await page.getByRole('navigation',{name:'Điều hướng quản trị'}).getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByLabel('Mã tài khoản',{exact:false}).fill(account.user.id);await page.getByRole('textbox',{name:'Lý do',exact:true}).fill('Kiểm chứng khóa tài khoản theo yêu cầu');await page.getByRole('button',{name:'Kiểm tra và xác nhận'}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận thay đổi'}).click();await expect(page.getByRole('heading',{name:`Đã cập nhật tài khoản #${account.user.id}`})).toBeVisible();
  const denied=await request.get(`${base}/auth/me`,{headers:{Authorization:`Bearer ${token}`}});expect(denied.status()).toBe(403);
  await page.getByLabel('Trạng thái mới').selectOption('ACTIVE');await page.getByRole('textbox',{name:'Lý do',exact:true}).fill('Mở lại sau khi kiểm tra');await page.getByRole('button',{name:'Kiểm tra và xác nhận'}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận thay đổi'}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  const login=await call(request,'/auth/login',{method:'POST',body:{email:account.user.email,password}});expect(login.user.role).toBe('HOUSEHOLD');
  await page.screenshot({path:'../../.cache/ui-audit/admin-desktop-live.png'});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('navigation',{name:'Điều hướng quản trị'})).not.toBeVisible();
  await page.getByRole('button',{name:'Mở điều hướng',exact:true}).click();
  await page.getByRole('navigation',{name:'Điều hướng quản trị'}).getByRole('button',{name:'Danh mục',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Phân loại nội dung'})).toBeVisible();
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1)}));
  expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.screenshot({path:'../../.cache/ui-audit/admin-mobile-live.png'});
  expect(errors).toEqual([]);
});

test('Admin rejects a submitted version with a reason and cannot enter using a CUSTOMER account',async({page,request})=>{
  const account=await customer(request),token=account.accessToken;const h=await call(request,'/households',{token,method:'POST',body:{title:'Hộ cần bổ sung UI',body:'Gia đình tổ chức các hoạt động du lịch cộng đồng.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}}});await call(request,'/households/me/submissions',{token,method:'POST',body:{revisionId:h.profile.revisionId,version:h.profile.version}});
  await loginAdmin(page);await page.getByRole('row').filter({hasText:'Hộ cần bổ sung UI'}).getByRole('button',{name:/Xem hồ sơ/}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Yêu cầu điều chỉnh'}).click();await expect(dialog.getByRole('alert')).toContainText('Thông tin chưa hợp lệ');await dialog.getByLabel('Ghi chú xét duyệt').fill('Bổ sung mô tả điều kiện tiếp đón khách');await dialog.getByRole('button',{name:'Yêu cầu điều chỉnh'}).click();await expect(dialog).not.toBeVisible();
  expect((await call(request,'/households/me',{token})).profile.reviewNote).toBe('Bổ sung mô tả điều kiện tiếp đón khách');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page.getByRole('heading',{name:'Đăng nhập quản trị'})).toBeVisible();
  await page.getByLabel('Email',{exact:false}).fill(account.user.email);await page.getByLabel('Mật khẩu',{exact:false}).first().fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('alert')).toContainText('yêu cầu quyền ADMIN');await expect(page.getByRole('navigation',{name:'Điều hướng quản trị'})).not.toBeVisible();
});

test('Admin previews private submitted photographs and approval publishes the same image',async({page,request})=>{
  const account=await customer(request),token=account.accessToken;
  const household=await call(request,'/households',{token,method:'POST',body:{title:'Hộ có hình ảnh UI',body:'Gia đình cung cấp các hoạt động trong vườn và lưu trú.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}}});
  const images=await call(request,'/households/me/images',{token});
  const upload=await request.post(`${base}/households/me/images`,{params:{revisionId:images.revisionId,version:images.version,expectedToken:images.mediaToken},headers:{Authorization:`Bearer ${token}`,'Content-Type':'image/webp'},data:imageBytes});
  expect(upload.status()).toBe(201);const uploaded=(await upload.json()).data.images[0];
  expect((await request.get(`${base}${uploaded.url}`)).status()).toBe(404);
  await call(request,'/households/me/submissions',{token,method:'POST',body:{revisionId:household.profile.revisionId,version:household.profile.version}});
  await loginAdmin(page);await page.getByRole('row').filter({hasText:'Hộ có hình ảnh UI'}).getByRole('button',{name:/Xem hồ sơ/}).click();
  const dialog=page.getByRole('dialog'),preview=dialog.getByRole('img',{name:'Ảnh 1, ảnh bìa'});
  await expect(preview).toBeVisible();await expect.poll(()=>preview.evaluate(image=>image.complete&&image.naturalWidth>0)).toBeTruthy();
  await dialog.getByRole('button',{name:'Duyệt phiên bản này'}).click();await expect(dialog).not.toBeVisible();
  expect((await request.get(`${base}${uploaded.url}`)).status()).toBe(200);
});
