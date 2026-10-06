export default function StatusToggle({ user, onToggleStatus }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={user.isActive}
      aria-label={user.isActive ? "Deactivate user" : "Activate user"}
      title={user.isActive ? "Turn off access" : "Turn on access"}
      onClick={() => onToggleStatus(user)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 ${
        user.isActive ? "bg-brand-600" : "bg-line-strong"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-[0_1px_2px_rgba(11,59,46,0.25)] transition-transform ${
          user.isActive ? "translate-x-[23px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
