import { useRegisterPatient } from "@/hooks/use-patients";
import { useForm } from "react-hook-form";
import {
  RegisterPatientInput,
  registerPatientSchema,
} from "@/lib/validations/patient";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, User, Calendar, Phone, MapPin } from "lucide-react";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterPatientInput>({
    resolver: zodResolver(registerPatientSchema),
    defaultValues: {
      gender: "MALE",
    },
  });

  const registerPatient = useRegisterPatient();

  const onSubmit = (data: RegisterPatientInput) => {
    registerPatient.mutate(
      {
        ...data,
        dob: new Date(data.dob).toISOString(),
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-2xl shadow-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Register Patient</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {registerPatient.isError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center mb-4">
            {registerPatient.error?.message || "Registration failed"}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Juan"
                {...register("firstName")}
                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            {errors.firstName && (
              <p className="text-destructive text-sm">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Dela Cruz"
                {...register("lastName")}
                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            {errors.lastName && (
              <p className="text-destructive text-sm">
                {errors.lastName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                {...register("dob")}
                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            {errors.dob && (
              <p className="text-destructive text-sm">{errors.dob.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <select
              {...register("gender")}
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="tel"
                placeholder="+639171234567"
                {...register("phone")}
                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            {errors.phone && (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address (optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="123 Main St, Manila"
                {...register("address")}
                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={registerPatient.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {registerPatient.isPending ? "Registering..." : "Register Patient"}
          </button>
        </form>
      </div>
    </div>
  );
}
