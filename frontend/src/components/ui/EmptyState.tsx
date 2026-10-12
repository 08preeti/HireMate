export default function EmptyState({ message }: { message: string }) {
  return <div className="p-10 text-center text-gray-500 text-[16px] font-plain">{message}</div>;
}
