export default function Avatar({ member, size = 36 }) {
  if (!member) {
    return (
      <div
        className="rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ?
      </div>
    )
  }
  return (
    <div
      className="rounded-full text-white flex items-center justify-center font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: member.color || '#3a5ff5',
        fontSize: size * 0.4,
      }}
      title={member.name}
    >
      {member.avatar}
    </div>
  )
}
