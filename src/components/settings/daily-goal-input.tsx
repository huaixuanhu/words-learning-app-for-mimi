type DailyGoalInputProps = Readonly<{
  name: string;
  label: string;
  value: number;
}>;

export function DailyGoalInput({ name, label, value }: DailyGoalInputProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--mimi-text)]">{label}</span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        defaultValue={value}
        className="mimi-input min-h-11 px-3 text-base"
      />
    </label>
  );
}
