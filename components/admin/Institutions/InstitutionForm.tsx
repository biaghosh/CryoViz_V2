"use client";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  abbr: z.string().min(1, "Abbreviation is required"),
  type: z.enum(["Industry", "Government", "Academic", "Others"]),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address"),
  website: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Hold"]),
});

export type FormData = z.infer<typeof formSchema>;

interface InstitutionFormProps {
  onSubmit: (data: FormData) => void;
  defaultValues?: Partial<FormData>;
}

export default function InstitutionForm({
  onSubmit,
  defaultValues,
}: InstitutionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbr: "",
      type: "Industry",
      address: "",
      phone: "",
      email: "",
      website: "",
      status: "Active",
      ...defaultValues, // allow edit to hydrate fields
    },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
    if (!defaultValues?._id) reset(); // only clear on create
  };

  const isEditing = Boolean(defaultValues?._id);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium">Name: *</label>
          <Input
            {...register("name")}
            required
            disabled={isEditing}
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Abbr: *</label>
          <Input {...register("abbr")} required className="mt-1" />
          {errors.abbr && (
            <p className="mt-1 text-sm text-red-600">{errors.abbr.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Address:</label>
          <Input {...register("address")} className="mt-1" />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Phone Number:</label>
          <Input {...register("phone")} className="mt-1" />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Email: *</label>
          <Input {...register("email")} required className="mt-1" />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Website:</label>
          <Input {...register("website")} className="mt-1" />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Status:</label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Type:</label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Industry">Industry</SelectItem>
                  <SelectItem value="Government">Government</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="w-full md:w-auto">
          {isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}