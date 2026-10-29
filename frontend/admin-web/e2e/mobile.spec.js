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
  await page.getByRole('button',{name:'Hình ảnh hồ sơ',exact:true}).click();
  const imageBytes=Buffer.from('UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+82mX/mwIGaH0wf+mkeNI8aR8poAA','base64');
  const imagePath=`/households/me/rooms/${r.room.id}/images`;
  for(let index=1;index<=2;index++){
    const choosing=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Tải ảnh lên',exact:true}).click();
    response=changed(page,imagePath);await(await choosing).setFiles({name:`phong-${index}.webp`,mimeType:'image/webp',buffer:imageBytes});
    expect((await saved(response)).images).toHaveLength(index);
  }
  response=changed(page,`${imagePath}/order`,'PUT');await page.getByRole('button',{name:'Đưa ảnh ra sau',exact:true}).first().click();await saved(response);
  response=changed(page,`${imagePath}/order`,'PUT');await page.getByRole('button',{name:'Đặt làm ảnh bìa',exact:true}).first().click();const covered=await saved(response);expect(covered.images[0].isCover).toBe(true);
  await page.getByRole('button',{name:'Gỡ ảnh',exact:true}).last().click();
  response=changed(page,`${imagePath}/${covered.images[1].id}`,'DELETE');await page.getByRole('button',{name:'Gỡ ảnh',exact:true}).last().click();expect((await saved(response)).images).toHaveLength(1);
  await back(page,'Phòng lưu trú');
  response=changed(page,`/households/me/rooms/${r.room.id}/submissions`);await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();r=await saved(response);
  await api(request,`/admin/room-submissions/${r.profile.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:r.profile.version,decision:'APPROVED'}});
  const published=await api(request,`/public/rooms/${r.room.id}`);expect(published.room.title).toBe('Phòng Flutter hướng vườn');
  expect((await api(request,`/public/rooms/${r.room.id}/images`)).images).toHaveLength(1);
  await page.getByRole('button',{name:'Xóa / lưu trữ',exact:true}).click();await fill(page,'Lý do','Ngừng nhận đặt để bảo trì');
  response=changed(page,`/households/me/rooms/${r.room.id}`,'DELETE');await page.getByRole('button',{name:'Xác nhận',exact:true}).click();expect((await saved(response)).archivedAt).toBeTruthy();
  expect((await request.get(`${base}/public/rooms/${r.room.id}`)).status()).toBe(404);
  await page.getByRole('button',{name:'Khôi phục hồ sơ',exact:true}).click();await fill(page,'Lý do','Đã bảo trì xong');
  response=changed(page,`/households/me/rooms/${r.room.id}/restore`);await page.getByRole('button',{name:'Xác nhận',exact:true}).click();expect((await saved(response)).archivedAt).toBeNull();
  await back(page,'Phòng lưu trú');await back(page,'Không gian hộ dân');
  const tomorrow=new Date(Date.now()+7*3600000+86400000).toISOString().slice(0,10);
  const category=await api(request,'/admin/categories',{token:admin.accessToken,method:'POST',body:{kind:'SERVICE',code:`CAL_UI_${Date.now()}`,name:'Lịch phục vụ UI',isActive:true,reason:'Kiểm thử lịch'}});
  let scheduleService=await api(request,'/households/me/services',{token:account.accessToken,method:'POST',body:{title:'Dịch vụ lịch Flutter',body:'Trải nghiệm trong vườn theo khung giờ phục vụ của gia đình.',categoryId:category.category.id,defaultPlaceId:p.place.id,defaultDurationMinutes:120}});
  await api(request,`/households/me/services/${scheduleService.service.id}/offers`,{token:account.accessToken,method:'POST',body:{name:'Khách ghép lịch UI',participationMode:'SHARED',pricingType:'PER_PERSON',unitPriceVnd:150000,minParticipants:1,maxParticipants:10,terms:{scopeDescription:'Toàn bộ trải nghiệm trong khung giờ đã chọn.'}}});
  scheduleService=await api(request,`/households/me/services/${scheduleService.service.id}`,{token:account.accessToken});
  await api(request,`/households/me/services/${scheduleService.service.id}/submissions`,{token:account.accessToken,method:'POST',body:{revisionId:scheduleService.profile.revisionId,version:scheduleService.profile.version,offersToken:scheduleService.offersToken}});
  await api(request,`/admin/service-submissions/${scheduleService.profile.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:scheduleService.profile.version,decision:'APPROVED'}});
  await page.getByRole('button',{name:/^Lịch và sức chứa/}).click();
  await page.getByRole('button',{name:'Tạo khung giờ',exact:true}).click();
  await page.getByRole('button',{name:/^Dịch vụ:/}).click();await page.getByRole('button',{name:/Dịch vụ lịch Flutter/}).click();
  await fill(page,'Ngày bắt đầu',tomorrow);await fill(page,'Giờ bắt đầu','09:00');await fill(page,'Ngày kết thúc',tomorrow);await fill(page,'Giờ kết thúc','11:00');
  response=changed(page,'/households/me/calendar/slots');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();let slot=(await saved(response)).slot;
  await page.getByRole('button',{name:/10 người/}).click();await page.getByRole('button',{name:'Sửa khung giờ và sức chứa',exact:true}).click();
  await fill(page,'Sức chứa \\(người\\)','12');await fill(page,'Lý do thay đổi','Tăng sức chứa đã chuẩn bị');
  response=changed(page,`/households/me/calendar/slots/${slot.id}`,'PUT');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();slot=(await saved(response)).slot;expect(slot.personCapacity).toBe(12);
  await back(page,'Lịch và sức chứa');await page.getByRole('button',{name:'Tài nguyên',exact:true}).click();await page.getByRole('button',{name:'Thêm tài nguyên',exact:true}).click();
  await fill(page,'Mã tài nguyên','CAL_BIKES');await fill(page,'Tên tài nguyên','Xe đạp lịch UI');await fill(page,'Tổng số lượng','3');
  response=changed(page,'/households/me/calendar/resources');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();const resource=(await saved(response)).resource;expect(resource.totalQuantity).toBe(3);
  await page.getByRole('button',{name:'Lịch chặn',exact:true}).click();await page.getByRole('button',{name:'Thêm lịch chặn',exact:true}).click();
  await page.getByRole('button',{name:/^Tài nguyên:/}).click();await page.getByRole('button',{name:/Xe đạp lịch UI/}).click();
  await fill(page,'Ngày bắt đầu',tomorrow);await fill(page,'Giờ bắt đầu','09:00');await fill(page,'Ngày kết thúc',tomorrow);await fill(page,'Giờ kết thúc','11:00');await fill(page,'Lý do thay đổi','Bảo trì lịch UI');
  response=changed(page,'/households/me/calendar/blocks');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();const block=(await saved(response)).block;expect(block.resourceId).toBe(resource.id);
  await page.getByRole('button',{name:'Gỡ lịch chặn',exact:true}).first().click();await fill(page,'Lý do','Đã bảo trì xong');
  response=changed(page,`/households/me/calendar/blocks/${block.id}`,'DELETE');await page.getByRole('button',{name:'Xác nhận',exact:true}).click();expect((await saved(response)).block.releasedAt).toBeTruthy();
  await back(page,'Không gian hộ dân');
  await page.getByRole('button',{name:'Khám phá',exact:true}).click();await page.getByRole('button',{name:'Lưu trú',exact:true}).click();
  await page.getByRole('button',{name:/Xem chi tiết Phòng Flutter hướng vườn/}).click({position:{x:70,y:220}});
  await expect(page.getByRole('button',{name:'Đặt ngay',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Lịch trống và sức chứa',exact:true}).click();
  const checkout=new Date(Date.parse(`${tomorrow}T00:00:00Z`)+86400000).toISOString().slice(0,10);
  await fill(page,'Ngày nhận phòng',tomorrow);await fill(page,'Ngày trả phòng',checkout);
  response=changed(page,`/public/rooms/${r.room.id}/availability`,'GET');await page.getByRole('button',{name:'Kiểm tra lịch',exact:true}).click();
  expect((await saved(response)).available).toBe(true);await expect(page.getByRole('group',{name:/Phòng còn trống cho khoảng ngày đã chọn/})).toBeVisible();
  await page.screenshot({path:'../../.cache/ui-audit/flutter-room-live.png'});
  expect(errors).toEqual([]);
});
