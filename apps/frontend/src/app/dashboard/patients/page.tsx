"use client";

import { AddPatientModal } from "@/components/add-patient-modal";
import { usePatients } from "@/hooks/use-patients";
import { Calendar, MapPin, Phone, Plus, User } from "lucide-react";
import { useState } from "react";

export default function PatientsPage() {
  const { data: patients, isLoading, isError } = usePatients();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) return <div className="p-8">Loading patients...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load.</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">
          {patients?.length || 0} registered
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      {patients?.length === 0 && (
        <div className="text-center py-12 border rounded-lg text-muted-foreground">
          No patients registered yet
        </div>
      )}

      <div className="space-y-3">
        {patients?.map((patient) => (
          <div
            key={patient.id}
            className="border p-4 rounded-lg flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.gender}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{patient.phone}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(patient.dob).toLocaleDateString()}
                </span>
              </div>
            </div>

            {patient.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm truncate max-w-[200px]">
                  {patient.address}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
