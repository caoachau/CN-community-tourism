export const messages = {
  INVALID_CREDENTIALS:'Email hoặc mật khẩu chưa đúng, hoặc tài khoản không còn hoạt động.',
  UNAUTHENTICATED:'Phiên đã hết hiệu lực. Vui lòng đăng nhập lại.',ACCOUNT_BLOCKED:'Tài khoản đã bị khóa hoặc vô hiệu hóa.',
  FORBIDDEN:'Tài khoản không có quyền thực hiện thao tác này.',ADMIN_REQUIRED:'Tài khoản này dùng giao diện khách/hộ dân. Trang quản trị yêu cầu quyền ADMIN.',
  STALE_VERSION:'Nội dung đã thay đổi. Hãy tải lại và đối chiếu trước khi thao tác lại.',INVALID_STATE:'Trạng thái hiện tại không cho phép thao tác này.',
  VALIDATION_ERROR:'Thông tin chưa hợp lệ. Kiểm tra các trường bên dưới.',NOT_FOUND:'Không tìm thấy nội dung hoặc tài khoản.',
  CATEGORY_ALREADY_EXISTS:'Mã danh mục đã tồn tại trong nhóm này.',HOUSEHOLD_NOT_APPROVED:'Hộ không còn đủ điều kiện nhận cam kết mới.',
  SERVICE_PLACE_NOT_READY:'Điểm tổ chức chưa được duyệt, đang ẩn hoặc ngừng cung cấp.',ROOM_PLACE_NOT_READY:'Điểm lưu trú chưa được duyệt, đang ẩn hoặc ngừng cung cấp.',
  ROOM_CONFIGURATION_LOCKED:'Phòng còn cam kết phục vụ; chưa thể thay đổi điểm, sức chứa hoặc giờ nhận/trả.',
  SERVICE_OFFER_INVALID:'Phương thức bán chưa đầy đủ hoặc cấu trúc đã thay đổi so với bản gửi duyệt.',
  RATE_LIMITED:'Có quá nhiều yêu cầu. Vui lòng thử lại sau.',NETWORK_ERROR:'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  TIMEOUT:'Máy chủ phản hồi chậm. Vui lòng thử lại.',CONFIGURATION:'Địa chỉ API chưa được cấu hình đúng.',SESSION_CHANGED:'Phiên làm việc đã thay đổi.',
};
export class ApiError extends Error {
  constructor(code,{requestId,issues=[]}={}) { super(messages[code]??'Chưa thể hoàn tất thao tác. Vui lòng thử lại.');this.name='ApiError';this.code=code;this.requestId=requestId;this.issues=issues; }
}
export function normalizeBase(value='/api/v1') {
  const trimmed=value.replace(/\/+$/,'');return trimmed.endsWith('/api')?`${trimmed}/v1`:trimmed;
}
export class ApiClient {
  #access; #refresh; #refreshing; #refreshEpoch; #epoch=0; #listeners=new Set();
  constructor({baseUrl='/api/v1',fetcher=(...args)=>globalThis.fetch(...args)}={}) { this.baseUrl=normalizeBase(baseUrl);this.fetcher=fetcher;this.user=null;this.notice=null; }
  subscribe=(listener)=>{this.#listeners.add(listener);return()=>this.#listeners.delete(listener);};
  #notify(){for(const listener of this.#listeners)listener();}
  clear(notice=null){this.#epoch++;this.#access=null;this.#refresh=null;this.user=null;this.notice=notice;this.#notify();}
  async #send(method,path,{body,query,token,signal,binary=false}={}) {
    const origin=globalThis.location?.origin??'http://localhost';let url;
    try {url=new URL(`${this.baseUrl}${path}`,origin);if(url.username||url.password||!['https:','http:'].includes(url.protocol))throw new Error();}
    catch {throw new ApiError('CONFIGURATION');}
    for(const [key,value] of Object.entries(query??{}))if(value!==undefined&&value!==null&&String(value)!=='')url.searchParams.set(key,String(value));
    const controller=new AbortController();let timedOut=false;
    const abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},25000);
    try {
      const response=await this.fetcher(url,{method,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{Accept:binary?'image/webp':'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      if(binary&&response.ok&&response.headers.get('content-type')?.startsWith('image/webp'))return response.blob();
      let payload;try {payload=await response.json();}catch {throw new ApiError('INVALID_RESPONSE');}
      if(!response.ok||payload.success!==true)throw new ApiError(payload.error?.code??'INVALID_RESPONSE',{requestId:payload.meta?.requestId,issues:payload.error?.details??[]});
      return payload.data;
    }catch(error){if(error instanceof ApiError||signal?.aborted)throw error;throw new ApiError(timedOut?'TIMEOUT':'NETWORK_ERROR');}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  #accept(data,generation){
    if(generation!==this.#epoch)throw new ApiError('SESSION_CHANGED');
    if(typeof data.accessToken!=='string'||typeof data.refreshToken!=='string'||!data.user?.id)throw new ApiError('INVALID_RESPONSE');
    this.#access=data.accessToken;this.#refresh=data.refreshToken;this.user=data.user;this.notice=null;this.#notify();
  }
  async login(input) {
    this.clear();const generation=this.#epoch;
    this.#accept(await this.#send('POST','/auth/login',{body:input}),generation);
    if(this.user.role!=='ADMIN'){try{await this.logout();}catch{this.clear();}throw new ApiError('ADMIN_REQUIRED');}
    return this.user;
  }
  async #rotate(){
    if(this.#refreshing&&this.#refreshEpoch===this.#epoch)return this.#refreshing;
    const generation=this.#epoch,token=this.#refresh;if(!token)throw new ApiError('UNAUTHENTICATED');
    const work=(async()=>{try{this.#accept(await this.#send('POST','/auth/refresh',{body:{refreshToken:token}}),generation);}catch(error){if(generation===this.#epoch&&['UNAUTHENTICATED','ACCOUNT_BLOCKED'].includes(error.code))this.clear(error.message);throw error;}})();
    this.#refreshEpoch=generation;this.#refreshing=work;try{await work;}finally{if(this.#refreshing===work)this.#refreshing=null;}
  }
  async request(method,path,options={}) {
    const generation=this.#epoch,usedToken=this.#access,authenticated=options.authenticated!==false;
    if(authenticated&&!usedToken)throw new ApiError('UNAUTHENTICATED');
    try {
      let result;
      try {result=await this.#send(method,path,{...options,token:authenticated?usedToken:null});}
      catch(error){if(!authenticated||error.code!=='UNAUTHENTICATED')throw error;if(generation!==this.#epoch)throw new ApiError('SESSION_CHANGED');if(usedToken===this.#access)await this.#rotate();result=await this.#send(method,path,{...options,token:this.#access});}
      if(authenticated&&generation!==this.#epoch)throw new ApiError('SESSION_CHANGED');return result;
    }catch(error){if(authenticated&&generation===this.#epoch&&['UNAUTHENTICATED','ACCOUNT_BLOCKED'].includes(error.code))this.clear(error.message);throw error;}
  }
  async currentUser(){const data=await this.request('GET','/auth/me');this.user=data.user;if(this.user.role!=='ADMIN'){this.clear(messages.ADMIN_REQUIRED);throw new ApiError('ADMIN_REQUIRED');}this.#notify();return this.user;}
  async logout(){try{await this.request('POST','/auth/logout');}finally{this.clear();}}
}
