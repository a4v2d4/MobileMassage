import { useState, useRef, useCallback, useEffect } from "react";

const BRAND = {
  sage: "#7A9E7E",
  stone: "#C4B9A8",
  warm: "#F7F3EE",
  earth: "#5C4A3A",
  cream: "#EDE8E1",
  mist: "#B8C9BC",
  text: "#2E2520",
  sub: "#7A6E65",
};

const HASHTAG_POOL = [
  "#sonomabodyworks","#sonomamassage","#bodywork","#massagetherapy",
  "#sonomacounty","#sonomawellness","#healingtouch","#selfcare",
  "#holistichealth","#deeptissuemassage","#relaxation","#wellness",
  "#sonomacountyliving","#wineandwellness","#spaday","#mindbodyspirit",
];
const pickHashtags = (n=8) => [...HASHTAG_POOL].sort(()=>Math.random()-.5).slice(0,n).join(" ");

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }
function postLabel(date,time){
  return new Date(`${date}T${time}`).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function hydratePost(post){
  return {
    ...post,
    photo: post.photo || post.imageUrl,
    datetime: new Date(post.scheduledAt || `${post.date}T${post.time}`),
    label: post.label || postLabel(post.date, post.time),
  };
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 560 }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,32,24,0.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:BRAND.warm,borderRadius:16,width:"100%",maxWidth,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        {children}
      </div>
    </div>
  );
}

// ── Post Composer ──────────────────────────────────────────────────────────────
function Composer({ initialDate, onSave, onClose }) {
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("manual"); // manual | ai
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [date, setDate] = useState(initialDate || "");
  const [time, setTime] = useState("09:00");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
    const r = new FileReader();
    r.onload = e => setPhoto(e.target.result);
    r.readAsDataURL(file);
  };

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }, []);

  const generateAI = async () => {
    if (!photo) return;
    setAiLoading(true); setAiError(""); setCaption("");
    try {
      const base64 = photo.split(",")[1];
      const mediaType = photoFile?.type || "image/jpeg";
      const res = await fetch("/api/generate-caption",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ image:base64, mediaType, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't generate.");
      const text = data.caption || "";
      setCaption(text+"\n\n"+pickHashtags());
    } catch { setAiError("Couldn't generate — try again."); }
    finally { setAiLoading(false); }
  };

  const canSave = photo && caption.trim() && date && time;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave({
        photo,
        photoFile,
        caption,
        date,
        time,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this post.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{padding:24}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:15,color:BRAND.earth}}>New Post</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:BRAND.sub,fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
      </div>

      {/* Photo drop */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        onClick={()=>fileRef.current.click()}
        style={{border:`2px dashed ${dragging?BRAND.sage:BRAND.stone}`,borderRadius:10,background:dragging?"#f0f5f1":BRAND.cream,
          padding:photo?"4px":"32px 20px",textAlign:"center",cursor:"pointer",marginBottom:16,transition:"all .2s",overflow:"hidden"}}
      >
        {photo
          ? <img src={photo} alt="preview" style={{width:"100%",maxHeight:"45vh",objectFit:"contain",borderRadius:8,display:"block",background:BRAND.warm}}/>
          : <div><div style={{fontSize:32,marginBottom:8}}>🌿</div>
              <div style={{color:BRAND.earth,fontSize:14,marginBottom:4}}>Drop photo or click to browse</div>
              <div style={{color:BRAND.sub,fontSize:11,fontFamily:"sans-serif"}}>JPG · PNG · HEIC</div>
            </div>
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>

      {/* Caption mode toggle */}
      <div style={{display:"flex",gap:0,marginBottom:12,background:BRAND.cream,borderRadius:8,padding:3}}>
        {["manual","ai"].map(m=>(
          <button key={m} onClick={()=>setMode(m)}
            style={{flex:1,background:mode===m?"white":"transparent",border:"none",borderRadius:6,padding:"7px 0",
              fontSize:12,fontFamily:"sans-serif",color:mode===m?BRAND.earth:BRAND.sub,
              cursor:"pointer",fontWeight:mode===m?"bold":"normal",transition:"all .15s"}}>
            {m==="manual"?"✏️ Write manually":"✨ AI caption"}
          </button>
        ))}
      </div>

      {mode==="manual" ? (
        <textarea value={caption} onChange={e=>setCaption(e.target.value)}
          placeholder="Write your caption… #sonomabodyworks"
          rows={5}
          style={{width:"100%",boxSizing:"border-box",background:BRAND.cream,border:`1px solid ${BRAND.stone}`,
            borderRadius:8,padding:"12px 14px",fontSize:13,fontFamily:"sans-serif",color:BRAND.text,
            resize:"none",outline:"none",lineHeight:1.6,marginBottom:14}}
        />
      ) : (
        <div style={{marginBottom:14}}>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Optional context: 'new hot stone room', 'spring promo'…"
            rows={2}
            style={{width:"100%",boxSizing:"border-box",background:BRAND.cream,border:`1px solid ${BRAND.stone}`,
              borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"sans-serif",color:BRAND.text,
              resize:"none",outline:"none",marginBottom:8}}
          />
          <button onClick={generateAI} disabled={!photo||aiLoading}
            style={{width:"100%",background:photo&&!aiLoading?BRAND.sage:BRAND.stone,color:"white",border:"none",
              borderRadius:8,padding:"10px",fontSize:13,fontFamily:"sans-serif",cursor:photo&&!aiLoading?"pointer":"default"}}>
            {aiLoading?"Writing…":"✦ Generate Caption"}
          </button>
          {aiError && <div style={{color:"#c0392b",fontSize:12,fontFamily:"sans-serif",marginTop:6}}>{aiError}</div>}
          {caption && (
            <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={5}
              style={{width:"100%",boxSizing:"border-box",background:BRAND.cream,border:`1px solid ${BRAND.stone}`,
                borderRadius:8,padding:"12px 14px",fontSize:13,fontFamily:"sans-serif",color:BRAND.text,
                resize:"none",outline:"none",lineHeight:1.6,marginTop:10}}
            />
          )}
        </div>
      )}

      {/* Date + Time */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div>
          <label style={{display:"block",fontSize:10,fontFamily:"sans-serif",color:BRAND.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Date</label>
          <input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}
            style={{width:"100%",boxSizing:"border-box",background:BRAND.cream,border:`1px solid ${BRAND.stone}`,borderRadius:8,padding:"10px 12px",fontFamily:"sans-serif",fontSize:13,color:BRAND.text,outline:"none"}}/>
        </div>
        <div>
          <label style={{display:"block",fontSize:10,fontFamily:"sans-serif",color:BRAND.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Time</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)}
            style={{width:"100%",boxSizing:"border-box",background:BRAND.cream,border:`1px solid ${BRAND.stone}`,borderRadius:8,padding:"10px 12px",fontFamily:"sans-serif",fontSize:13,color:BRAND.text,outline:"none"}}/>
        </div>
      </div>
      <div style={{fontSize:11,fontFamily:"sans-serif",color:BRAND.sub,marginBottom:16}}>💡 Best times: Tue–Thu 9–11am or 6–8pm</div>

      {saveError && <div style={{color:"#c0392b",fontSize:12,fontFamily:"sans-serif",marginBottom:10}}>{saveError}</div>}
      <button onClick={save} disabled={!canSave||saving}
        style={{width:"100%",background:canSave&&!saving?BRAND.earth:BRAND.stone,color:"white",border:"none",borderRadius:8,
          padding:"13px",fontSize:14,fontFamily:"sans-serif",cursor:canSave&&!saving?"pointer":"default",letterSpacing:"0.04em"}}>
        {saving ? "Saving..." : "Add to Calendar"}
      </button>
    </div>
  );
}

// ── Post Detail Modal ──────────────────────────────────────────────────────────
function PostDetail({ post, onDelete, onClose }) {
  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,fontFamily:"sans-serif",color:BRAND.sage,fontWeight:"bold"}}>📅 {post.label}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:BRAND.sub,fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
      </div>
      <img src={post.photo} alt="" style={{width:"100%",maxHeight:"68vh",objectFit:"contain",borderRadius:10,marginBottom:14,display:"block",background:BRAND.cream}}/>
      <div style={{background:BRAND.cream,borderRadius:8,padding:"12px 14px",fontSize:13,fontFamily:"sans-serif",color:BRAND.text,lineHeight:1.7,marginBottom:16,whiteSpace:"pre-wrap"}}>
        {post.caption}
      </div>
      <button onClick={()=>onDelete(post.id)}
        style={{width:"100%",background:"none",border:`1px solid #c0392b`,color:"#c0392b",borderRadius:8,padding:"10px",fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>
        Remove Post
      </button>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function SonomaInstagram() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [scheduled, setScheduled] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [composerDate, setComposerDate] = useState(null); // null=closed, ""=no date, "YYYY-MM-DD"=prefilled
  const [detailPost, setDetailPost] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoadingPosts(true);
      setBackendError("");
      try {
        const res = await fetch("/api/posts");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load scheduled posts.");
        if (!cancelled) setScheduled((data.posts || []).map(hydratePost));
      } catch (error) {
        if (!cancelled) setBackendError(error instanceof Error ? error.message : "Could not load scheduled posts.");
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    }

    loadPosts();
    return () => { cancelled = true; };
  }, []);

  const addPost = async (post) => {
    const base64 = post.photo.split(",")[1];
    const uploadRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64,
        mediaType: post.photoFile?.type || "image/jpeg",
        fileName: post.photoFile?.name || "post-image.jpg",
      }),
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData?.error || "Could not upload image.");

    const postRes = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: uploadData.url,
        imagePathname: uploadData.pathname,
        caption: post.caption,
        date: post.date,
        time: post.time,
        scheduledAt: post.scheduledAt,
      }),
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData?.error || "Could not save scheduled post.");

    const savedPost = hydratePost(postData.post);
    setScheduled(p=>[...p,savedPost].sort((a,b)=>a.datetime-b.datetime));
    setComposerDate(null);
  };

  const deletePost = async (id) => {
    setBackendError("");
    try {
      const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not remove post.");
      setScheduled(p=>p.filter(x=>x.id!==id));
      setDetailPost(null);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Could not remove post.");
    }
  };

  const prevMonth = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const todayStr = now.toISOString().split("T")[0];

  const postsOnDay = (d) => {
    const key = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return scheduled.filter(p=>p.date===key);
  };

  const clickDay = (d) => {
    const key = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const posts = postsOnDay(d);
    if (posts.length===1) { setDetailPost(posts[0]); return; }
    // multiple posts or empty — open composer prefilled with date
    setComposerDate(key);
  };

  // Build calendar grid
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);

  return (
    <div style={{minHeight:"100vh",background:BRAND.warm,fontFamily:"'Georgia',serif",color:BRAND.text}}>
      {/* Header */}
      <div style={{background:BRAND.earth,padding:"16px 24px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:BRAND.sage,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/></svg>
        </div>
        <div>
          <div style={{color:BRAND.stone,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"sans-serif"}}>Sonoma Bodyworks</div>
          <div style={{color:"white",fontSize:14}}>Instagram Scheduler</div>
        </div>
        <button onClick={()=>setComposerDate("")}
          style={{marginLeft:"auto",background:BRAND.sage,color:"white",border:"none",borderRadius:20,padding:"7px 18px",fontSize:12,fontFamily:"sans-serif",cursor:"pointer",letterSpacing:"0.05em"}}>
          + New Post
        </button>
      </div>

      <div style={{maxWidth:780,margin:"0 auto",padding:"28px 16px"}}>
        {backendError && (
          <div style={{background:"#fff8f6",border:"1px solid #e7b6ad",borderRadius:8,padding:"10px 12px",fontSize:12,fontFamily:"sans-serif",color:"#8f2f22",marginBottom:16}}>
            {backendError}
          </div>
        )}

        {/* Calendar nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <button onClick={prevMonth} style={{background:"none",border:`1px solid ${BRAND.stone}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"sans-serif",fontSize:13,color:BRAND.earth}}>‹</button>
          <div style={{fontSize:17,color:BRAND.earth}}>{MONTHS[viewMonth]} {viewYear}</div>
          <button onClick={nextMonth} style={{background:"none",border:`1px solid ${BRAND.stone}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"sans-serif",fontSize:13,color:BRAND.earth}}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
          {DAYS.map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontFamily:"sans-serif",color:BRAND.sub,letterSpacing:"0.1em",textTransform:"uppercase",paddingBottom:6}}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const posts = postsOnDay(d);
            const dStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday = dStr===todayStr;
            const isPast = dStr<todayStr;
            return (
              <div key={d} onClick={()=>clickDay(d)}
                style={{minHeight:72,background:isToday?"#EBF2EC":isPast?"#f5f2ee":BRAND.cream,
                  borderRadius:10,border:`1px solid ${isToday?BRAND.sage:BRAND.stone}`,
                  padding:"6px 7px",cursor:"pointer",transition:"box-shadow .15s",position:"relative"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
              >
                <div style={{fontSize:11,fontFamily:"sans-serif",fontWeight:isToday?"bold":"normal",
                  color:isToday?BRAND.sage:isPast?BRAND.stone:BRAND.earth,marginBottom:4}}>{d}</div>
                {posts.slice(0,2).map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                    <img src={p.photo} alt="" style={{width:18,height:18,borderRadius:3,objectFit:"cover",flexShrink:0}}/>
                    <div style={{fontSize:9,fontFamily:"sans-serif",color:BRAND.earth,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",lineHeight:1.2}}>
                      {p.time}
                    </div>
                  </div>
                ))}
                {posts.length>2 && <div style={{fontSize:9,fontFamily:"sans-serif",color:BRAND.sub}}>+{posts.length-2} more</div>}
                {posts.length===0 && !isPast && (
                  <div style={{position:"absolute",bottom:5,right:7,fontSize:14,color:BRAND.stone,opacity:0.5}}>+</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming list */}
        {scheduled.length>0 && (
          <div style={{marginTop:32}}>
            <div style={{fontSize:11,fontFamily:"sans-serif",color:BRAND.sub,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>Upcoming Posts</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {scheduled.filter(p=>p.date>=todayStr).slice(0,6).map(p=>(
                <div key={p.id} onClick={()=>setDetailPost(p)}
                  style={{background:"white",borderRadius:10,display:"flex",gap:12,padding:12,
                    boxShadow:"0 1px 6px rgba(0,0,0,0.06)",alignItems:"center",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.06)"}
                >
                  <img src={p.photo} alt="" style={{width:52,height:52,borderRadius:7,objectFit:"cover",flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontFamily:"sans-serif",color:BRAND.sage,fontWeight:"bold",marginBottom:3}}>📅 {p.label}</div>
                    <div style={{fontSize:12,fontFamily:"sans-serif",color:BRAND.text,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      {p.caption.split("\n")[0]}
                    </div>
                  </div>
                  <div style={{color:BRAND.stone,fontSize:18,flexShrink:0}}>›</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingPosts && (
          <div style={{textAlign:"center",padding:"32px 20px",color:BRAND.sub,fontFamily:"sans-serif",fontSize:13}}>
            Loading scheduled posts...
          </div>
        )}

        {!loadingPosts && scheduled.length===0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:BRAND.sub,fontFamily:"sans-serif",fontSize:13}}>
            <div style={{fontSize:36,marginBottom:10}}>🌾</div>
            Click any day on the calendar to schedule your first post.
          </div>
        )}
      </div>

      {/* Composer modal */}
      {composerDate!==null && (
        <Modal onClose={()=>setComposerDate(null)}>
          <Composer initialDate={composerDate} onSave={addPost} onClose={()=>setComposerDate(null)}/>
        </Modal>
      )}

      {/* Post detail modal */}
      {detailPost && (
        <Modal onClose={()=>setDetailPost(null)} maxWidth={760}>
          <PostDetail post={detailPost} onDelete={deletePost} onClose={()=>setDetailPost(null)}/>
        </Modal>
      )}
    </div>
  );
}
