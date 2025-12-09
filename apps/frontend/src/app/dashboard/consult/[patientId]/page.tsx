"use client";

import { useParams, useRouter } from "next/navigation";
import { usePatients } from "@/hooks/use-patients";
import {
  useConsultNotes,
  useCreateConsultNote,
} from "@/hooks/use-consult-notes";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowLeft, Calendar, FileText, Phone, Plus, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConsultPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;

  const user = useAuthStore((state) => state.user);
  const { data: patients } = usePatients();
  const { data: notes, isLoading: notesLoading } = useConsultNotes(patientId);
  const createNote = useCreateConsultNote();

  const patient = patients?.find((p) => p.id === patientId);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNote.mutate(
      {
        patientId,
        doctorId: user?.id || "",
        ...formData,
      },
      {
        onSuccess: () => {
          toast.success("Note saved");
          setShowForm(false);
          setFormData({
            subjective: "",
            objective: "",
            assessment: "",
            plan: "",
          });
        },
      }
    );
  };

  if (!patient) {
    return <div className="p-8">Patient not found</div>;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-muted-foreground">Patient Consultation</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{patient.gender}</p>
          </div>
        </div>
        <div className="border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {new Date(patient.dob).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{patient.phone}</p>
          </div>
        </div>
      </div>

      {/* Add Note Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Consultation Notes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add SOAP Note
        </button>
      </div>

      {/* SOAP Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-xl p-6 bg-card space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Subjective</label>
              <textarea
                placeholder="Patient's complaints, history..."
                value={formData.subjective}
                onChange={(e) =>
                  setFormData({ ...formData, subjective: e.target.value })
                }
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Objective</label>
              <textarea
                placeholder="Vitals, physical exam findings..."
                value={formData.objective}
                onChange={(e) =>
                  setFormData({ ...formData, objective: e.target.value })
                }
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assessment</label>
              <textarea
                placeholder="Diagnosis, differential..."
                value={formData.assessment}
                onChange={(e) =>
                  setFormData({ ...formData, assessment: e.target.value })
                }
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <textarea
                placeholder="Treatment, medications, follow-up..."
                value={formData.plan}
                onChange={(e) =>
                  setFormData({ ...formData, plan: e.target.value })
                }
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createNote.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {createNote.isPending ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {notesLoading ? (
        <div>Loading notes...</div>
      ) : notes?.length === 0 ? (
        <div className="text-center py-12 border rounded-xl text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          No consultation notes yet
        </div>
      ) : (
        <div className="space-y-4">
          {notes?.map((note) => (
            <div key={note.id} className="border rounded-xl p-6 space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{note.doctor?.name}</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {note.subjective && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Subjective
                    </p>
                    <p>{note.subjective}</p>
                  </div>
                )}
                {note.objective && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Objective
                    </p>
                    <p>{note.objective}</p>
                  </div>
                )}
                {note.assessment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Assessment
                    </p>
                    <p>{note.assessment}</p>
                  </div>
                )}
                {note.plan && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Plan
                    </p>
                    <p>{note.plan}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
