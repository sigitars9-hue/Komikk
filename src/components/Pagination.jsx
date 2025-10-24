
export default function Pagination({page,setPage, total=3}){
  return (
    <div className="flex gap-2 justify-center">
      <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded-lg border border-white/10 disabled:opacity-30">{'<'}</button>
      {[...Array(total)].map((_,i)=>{
        const n=i+1; return (
          <button key={n} onClick={()=>setPage(n)}
            className={"px-3 py-1 rounded-lg " + (page===n ? "bg-brand text-white" : "bg-zinc-800")}>{n}</button>
        )
      })}
      <button onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-lg border border-white/10">{'>'}</button>
    </div>
  )
}
