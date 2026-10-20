export function householdOpenApi({ reference, jsonResponse, successSchema }) {
  const id = { type:'string', minLength:1, maxLength:20, pattern:'^[1-9][0-9]*$' };
  const version = { type:'integer', minimum:1, maximum:4294967295 };
  const date = { type:'string', format:'date-time' };
  const text = maxLength => ({ type:'string', minLength:1, maxLength });
  const referenceFields = { revisionId:reference('DatabaseId'), version };
  const details = {
    type:'object', additionalProperties:false, required:['introductionSections'],
    properties:{ address:text(500), locality:text(200), contactPhone:{ type:'string', minLength:8, maxLength:32, pattern:'^\\+?[0-9 ()-]+$' },
      zaloContact:text(200), introductionSections:{ type:'array', maxItems:20, items:{ type:'object', additionalProperties:false,
        required:['heading','text'], properties:{ heading:text(150), text:text(4000) } } } },
  };
  const draftDetails = { ...details };
  delete draftDetails.required;
  const profileFields = { title:text(200), body:{ type:'string', maxLength:20000, default:'' }, details:draftDetails };
  const profile = {
    type:'object', additionalProperties:false,
    required:['revisionId','version','title','body','details','status','schemaVersion','submittedAt','reviewedBy','reviewedAt','reviewNote','createdAt'],
    properties:{ ...referenceFields, title:text(200), body:{ type:'string', maxLength:20000 }, details,
      status:{ type:'string', enum:['DRAFT','PENDING','APPROVED','REJECTED'] }, schemaVersion:{ type:'integer', minimum:1 },
      submittedAt:{ ...date, nullable:true }, reviewedAt:{ ...date, nullable:true }, reviewedBy:{ ...id, nullable:true },
      reviewNote:{ ...text(2000), nullable:true }, createdAt:date },
  };
  const household = {
    type:'object', additionalProperties:false,
    required:['id','ownerUserId','code','approvalStatus','visibility','publishedRevisionId','archivedAt','createdAt','updatedAt'],
    properties:{ id:reference('DatabaseId'), ownerUserId:reference('DatabaseId'), code:text(40),
      approvalStatus:{ type:'string', enum:['DRAFT','PENDING','APPROVED','REJECTED','REVOKED'] }, visibility:{ type:'string', enum:['VISIBLE','HIDDEN'] },
      publishedRevisionId:{ ...id, nullable:true }, archivedAt:{ ...date, nullable:true }, createdAt:date, updatedAt:date },
  };
  const view = { type:'object', additionalProperties:false, required:['household','profile','publishedProfile','user'], properties:{
    household, profile:{ ...profile, nullable:true }, publishedProfile:{ ...profile, nullable:true },
    user:{ type:'object', additionalProperties:false, required:['id','email','phone','displayName','role','status'], properties:{
      id:reference('DatabaseId'), email:{ type:'string', format:'email' }, phone:{ type:'string', nullable:true }, displayName:text(150),
      role:{ type:'string', enum:['CUSTOMER','HOUSEHOLD','ADMIN'] }, status:{ type:'string', enum:['ACTIVE','BLOCKED'] },
    } },
  } };
  const page = items => ({ type:'object', additionalProperties:false, required:['items','page','pageSize','total'], properties:{
    items:{ type:'array', items }, page:{ type:'integer', minimum:1, maximum:100000 }, pageSize:{ type:'integer', minimum:1, maximum:100 }, total:{ type:'integer', minimum:0 },
  } });
  const operation = (operationId, summary, schema, { body, status=200, admin=false, parameters=[], description } = {}) => ({
    operationId, summary, ...(description ? { description } : {}), tags:[admin?'Administration':'Households'], security:[{ BearerAuth:[] }], parameters,
    ...(body?{ requestBody:{ required:true, content:{ 'application/json':{ schema:reference(body) } } } }:{}),
    responses:{ [status]:jsonResponse('Success; Cache-Control: no-store',reference(schema)),
      ...Object.fromEntries([400,401,403,404,409,415,422].map(code=>[code,{ $ref:'#/components/responses/ApiError' }])),
      default:{ $ref:'#/components/responses/ApiError' } },
  });
  const paging = [
    { name:'page', in:'query', schema:{ type:'integer', minimum:1, maximum:100000, default:1 } },
    { name:'pageSize', in:'query', schema:{ type:'integer', minimum:1, maximum:100, default:20 } },
  ];
  const revisionParam = { name:'revisionId', in:'path', required:true, schema:reference('DatabaseId') };
  return {
    paths:{
      '/api/v1/households':{ post:operation('openHousehold','Mở hồ sơ hộ DRAFT bằng tài khoản CUSTOMER','HouseholdResponse',{
        body:'HouseholdDraftRequest',status:201,description:'One household per account. The server assigns owner/code/status. Opening never promotes role. A repeated create returns 409; GET /me retrieves the existing profile.',
      }) },
      '/api/v1/households/me':{ get:operation('getMyHousehold','Xem hồ sơ, bản nháp và bản công khai của chính mình','HouseholdResponse',{
        description:'CUSTOMER may manage their own onboarding profile; HOUSEHOLD inherits CUSTOMER. Returns 404 if no household exists. ADMIN cannot use this owner route.',
      }) },
      '/api/v1/households/me/profile':{ put:operation('saveHouseholdProfile','Lưu bản nháp mới và giữ nguyên bản đã công khai','HouseholdResponse',{
        body:'HouseholdSaveRequest',description:'Supply the latest revisionId AND version. Each save creates the next DRAFT revision; stale saves return 409. A pending revision cannot be edited. Approved, rejected and revoked households may prepare a new revision; approval status/publication remain unchanged until review.',
      }) },
      '/api/v1/households/me/submissions':{ post:operation('submitHousehold','Gửi đúng phiên bản hồ sơ để xét duyệt','HouseholdChangeResponse',{
        body:'HouseholdRevisionReference',description:'Requires title >=3, body >=20, address >=5, locality >=2 characters and a contact phone. First/reapplications become PENDING; an already approved household remains APPROVED while its edited profile is pending. Repeating the same pending submission returns changed=false.',
      }) },
      '/api/v1/households/me/revisions':{ get:operation('getMyHouseholdRevisions','Xem lịch sử phiên bản và lý do từ chối','HouseholdRevisionListResponse',{ parameters:paging }) },
      '/api/v1/admin/household-applications':{ get:operation('listHouseholdApplications','ADMIN: danh sách phiên bản đã gửi xét duyệt','HouseholdApplicationListResponse',{
        admin:true,parameters:[...paging,{ name:'status',in:'query',schema:{ type:'string',enum:['PENDING','APPROVED','REJECTED'],default:'PENDING' } }],
        description:'The filter applies to content revision status, including edits of already approved households. Drafts are not in the review queue.',
      }) },
      '/api/v1/admin/household-applications/{revisionId}':{ get:operation('getHouseholdApplication','ADMIN: xem đúng phiên bản được gửi','HouseholdResponse',{
        admin:true,parameters:[revisionParam],description:'Only submitted revisions are accessible. In this admin response user is the applicant/owner, not the reviewing admin.',
      }) },
      '/api/v1/admin/household-applications/{revisionId}/review':{ post:operation('reviewHouseholdApplication','ADMIN: duyệt hoặc từ chối hồ sơ','HouseholdChangeResponse',{
        admin:true,body:'HouseholdReviewRequest',parameters:[revisionParam],
        description:'Reject requires a reason. Review must match the latest pending revision/version. Approval atomically publishes the revision, approves the household, promotes CUSTOMER to HOUSEHOLD, writes audit events and an in-app notification. Rejection of an edit retains the existing published profile and approved household. The identical decision/reason repeated by the same admin is a no-op while this remains the latest revision. Active existing JWT sessions immediately use the live DB role; no second account or forced login is required. Blocked owners cannot be approved. user is the applicant/owner.',
      }) },
    },
    schemas:{
      HouseholdDraftRequest:{ type:'object',additionalProperties:false,required:['title'],properties:profileFields,
        example:{ title:'Hộ du lịch Ba Thành',body:'Gia đình cung cấp các trải nghiệm bắt cá và nấu món địa phương.',details:{ address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567',introductionSections:[] } } },
      HouseholdRevisionReference:{ type:'object',additionalProperties:false,required:['revisionId','version'],properties:referenceFields },
      HouseholdSaveRequest:{ type:'object',additionalProperties:false,required:['revisionId','version','title'],properties:{ ...referenceFields,...profileFields } },
      HouseholdReviewRequest:{ type:'object',additionalProperties:false,required:['version','decision'],properties:{ version,decision:{ type:'string',enum:['APPROVED','REJECTED'] },reason:text(2000) },
        oneOf:[{ properties:{ decision:{ enum:['APPROVED'] } } },{ required:['reason'],properties:{ decision:{ enum:['REJECTED'] } } }] },
      HouseholdResponse:successSchema(view),
      HouseholdChangeResponse:successSchema({ ...view,required:[...view.required,'changed'],properties:{ ...view.properties,changed:{ type:'boolean' } } }),
      HouseholdRevisionListResponse:successSchema(page(profile)),
      HouseholdApplicationListResponse:successSchema(page({ type:'object',additionalProperties:false,
        required:['revisionId','householdId','ownerUserId','version','title','status','code','approvalStatus','submittedAt','reviewedAt'],
        properties:{ ...referenceFields,householdId:reference('DatabaseId'),ownerUserId:reference('DatabaseId'),title:text(200),status:{ type:'string',enum:['PENDING','APPROVED','REJECTED'] },
          code:text(40),approvalStatus:household.properties.approvalStatus,submittedAt:date,reviewedAt:{ ...date,nullable:true } } })),
    },
  };
}
