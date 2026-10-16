type Props = { onClick: () => void; disabled: boolean };
export function FilterButton({ onClick, disabled }: Props) {
  return <button disabled={disabled} onClick={onClick}>全部卖家</button>;
}
