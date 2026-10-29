import React, {useEffect, useState} from 'react';
import {ErrorNotice} from './components.jsx';

function ImagePreview({api,image,index}) {
  const [url,setUrl]=useState(null),[error,setError]=useState(null);
  useEffect(()=>{
    let active=true,objectUrl;const controller=new AbortController();
    api.request('GET',image.url,{binary:true,signal:controller.signal}).then(blob=>{
      if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}
    }).catch(error=>{if(active)setError(error);});
    return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[api,image.url]);
  return <figure className="review-image">{url?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Ảnh ${index+1}${image.isCover?', ảnh bìa':''}`} loading="lazy"/></a>:error?<ErrorNotice error={error}/>:<span role="status">Đang tải ảnh…</span>}<figcaption>Ảnh {index+1}{image.isCover?' · Ảnh bìa':''}</figcaption></figure>;
}
export function MediaGallery({api,revisionId}) {
  const [images,setImages]=useState([]),[error,setError]=useState(null);
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    api.request('GET',`/admin/revisions/${revisionId}/images`,{signal:controller.signal}).then(data=>{if(active)setImages(data.images);}).catch(error=>{if(active)setError(error);});
    return()=>{active=false;controller.abort();};
  },[api,revisionId]);
  if(error)return <ErrorNotice error={error}/>;
  return <section aria-label="Hình ảnh phiên bản"><h4>Hình ảnh</h4>{images.length?<div className="review-gallery">{images.map((image,index)=><ImagePreview key={image.id} api={api} image={image} index={index}/>)}</div>:<p className="muted">Phiên bản này chưa có ảnh.</p>}</section>;
}
