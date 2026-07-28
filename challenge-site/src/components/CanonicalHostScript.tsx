/** Runs before hydration — fixes cached bad redirects to :3005 or www. */
export default function CanonicalHostScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var l=location,h=l.hostname,p=l.port;if(h==="www.desirableproperties.org"||p==="3005"){location.replace("https://desirableproperties.org"+l.pathname+l.search+l.hash);}}catch(e){}})();`,
      }}
    />
  );
}
