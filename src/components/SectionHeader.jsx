
export default function SectionHeader({title, right}){
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <div>{right}</div>
    </div>
  )
}
