const demoAccounts = [
  ["Admin", "admin@hospital.com"],
  ["Doctor", "doctor@hospital.com"],
  ["Nurse", "nurse@hospital.com"],
  ["Front Desk", "frontdesk@hospital.com"],
  ["Billing", "billing@hospital.com"],
  ["Patient", "patient@hospital.com"],
];

export function DemoAccounts() {
  return (
    <section className="rounded-lg border bg-background/50 p-4 text-xs leading-relaxed text-muted-foreground">
      <h3 className="text-[13px] font-semibold text-foreground">
        Demo Accounts
      </h3>
      <p className="mt-1">Use these test accounts to explore abox.</p>
      <table className="mt-3 w-full text-left">
        <thead>
          <tr className="border-b">
            <th scope="col" className="pr-3 pb-1 font-medium text-foreground">
              Role
            </th>
            <th scope="col" className="pb-1 font-medium text-foreground">
              Email
            </th>
          </tr>
        </thead>
        <tbody>
          {demoAccounts.map(([role, email]) => (
            <tr key={email}>
              <td className="py-0.5 pr-3 whitespace-nowrap">{role}</td>
              <td className="break-all py-0.5">{email}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3">
        <span className="font-medium text-foreground">
          Password (all accounts):
        </span>{" "}
        <code className="break-all text-foreground">DEMO_password123!</code>
      </p>
      <p className="mt-2 italic">
        Demo data only. Please do not enter real patient information.
      </p>
    </section>
  );
}
