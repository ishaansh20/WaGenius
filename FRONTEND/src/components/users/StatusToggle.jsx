export default function StatusToggle({ user, onToggleStatus }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={user.isActive}
      aria-label={user.isActive ? "Deactivate user" : "Activate user"}
      onClick={() => onToggleStatus(user)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        user.isActive ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          user.isActive ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}
