export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="screen-enter">{children}</div>;
}
