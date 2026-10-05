import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Calendar, MapPin, Phone, User, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRegisterPatient } from "@/hooks/use-patients";
import {
  type RegisterPatientInput,
  registerPatientSchema,
} from "@/lib/validations/patient";

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
      },
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          aria-describedby="patient-registration-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-lg p-6 w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold">
              Register Patient
            </Dialog.Title>
            <button
              type="button"
              aria-label="Close patient registration"
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <Dialog.Description
            id="patient-registration-description"
            className="mb-5 text-sm leading-relaxed text-muted-foreground"
          >
            Register a walk-in patient. After saving, you can add them to the
            queue from the directory.
          </Dialog.Description>
          {registerPatient.isError && (
            <div
              className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center mb-4"
              role="alert"
            >
              {registerPatient.error?.message || "Registration failed"}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="firstName"
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
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="lastName"
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
              <label htmlFor="dob" className="text-sm font-medium">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="dob"
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
              <label htmlFor="gender" className="text-sm font-medium">
                Gender
              </label>
              <select
                id="gender"
                {...register("gender")}
                className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {errors.gender && (
              <p className="text-sm text-destructive">
                {errors.gender.message}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+639171234567"
                  {...register("phone")}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              {errors.phone && (
                <p className="text-destructive text-sm">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Address (optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="address"
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
              {registerPatient.isPending
                ? "Registering..."
                : "Register Patient"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
