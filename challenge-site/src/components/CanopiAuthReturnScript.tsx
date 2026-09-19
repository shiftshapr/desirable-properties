/**
 * If OAuth lands canopi_auth on a page without the Discuss embed (e.g. FAQ),
 * bounce back to the URL stored before sign-in so v1 / dp-canopi-bridge can apply auth.
 */
export default function CanopiAuthReturnScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{
var loc=location;
var hay=(loc.search||'')+(loc.hash||'');
if(!/canopi_auth/i.test(hay))return;
if(document.querySelector('script[data-canopi-id]'))return;
var back='';
try{back=sessionStorage.getItem('canopi_pre_auth_page')||sessionStorage.getItem('canopi_embed_auth_return')||'';}catch(e){}
if(!back)return;
var target;
try{target=new URL(back);}catch(e2){return;}
function dpHost(h){h=String(h||'').toLowerCase();return h==='desirableproperties.org'||h==='book.desirableproperties.org'||h==='staging.desirableproperties.org'||h==='staging.book.desirableproperties.org';}
try{
if(target.origin!==loc.origin){
if(!(dpHost(target.hostname)&&dpHost(loc.hostname)))return;
}
}catch(e3){return;}
var authQ=loc.search.match(/[?&]canopi_auth=([^&]+)/);
var authH=loc.hash.match(/canopi_auth=([^&]+)/);
var token=authQ?authQ[1]:(authH?authH[1]:'');
if(!token)return;
var base=target.origin+target.pathname+target.search;
var sep=base.indexOf('?')>=0?'&':'?';
loc.replace(base+sep+'canopi_auth='+encodeURIComponent(token)+'#canopi_auth='+token);
}catch(e){}})();`,
      }}
    />
  );
}
