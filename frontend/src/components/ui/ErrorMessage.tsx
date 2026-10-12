export default function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-10 text-center font-plain" role="alert">
      <div className="text-danger font-semibold text-[15px]">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-brand text-white rounded-lg py-2 px-5 font-semibold text-[14px] cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
