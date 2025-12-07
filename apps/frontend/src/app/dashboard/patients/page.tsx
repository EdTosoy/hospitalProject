"use client";

import { usePatients } from "@/hooks/use-patients";

export default function PatientsPage() {
  const { data: patients, isLoading, isError } = usePatients();

  if (isLoading) return <div className="p-8">Loading patients...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load.</div>;
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Patients</h1>
      {patients?.length === 0 && (
        <p className="text-muted-foreground">No patients registered yet</p>
      )}

      <ul className="space-y-2">
        {patients?.map((patient) => (
          <li
            key={patient.id}
            className="border p-4 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{patient.phone}</p>
              <p className="font-sm text-muted-foreground">
                {patient.gender} -
                {new Date(patient.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <span className="text-sm">{patient.address}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
