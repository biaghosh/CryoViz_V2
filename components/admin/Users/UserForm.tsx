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

  interface Institution {
    _id: string;
    name: string;
  }



  const formSchema = z.object({
    _id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    accessLevel: z.enum(["admin", "user"]),
    institutionId: z.string().min(1, "Institution is required"),
  });
  export type FormData = z.infer<typeof formSchema>;

  interface UserFormProps {
    onSubmit: (data: FormData) => void;
    defaultValues?: Partial<FormData>;
    institutions: Institution[];
  }

  export default function UserForm({
    onSubmit,
    defaultValues,
    institutions,
  }: UserFormProps) {
    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
      reset,
    } = useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: defaultValues || {
        name: "",
        email: "",
        accessLevel: "user",
        institutionId: "",
      },
    });

    const handleFormSubmit = (data: FormData) => {
      onSubmit(data);
      if (!defaultValues?._id) {
        reset();
      }
    };

    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {institutions.length === 0 && (
          <p className="text-sm text-red-600">
            No institutions available. Please create an institution first.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium">
              Name: *
            </label>
            <Input
              {...register("name")}
              required
              className="mt-1"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Email: *</label>
            <Input
              {...register("email")}
              required
              disabled={!!defaultValues?._id}
              className="mt-1"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Level: *</label>
            <Controller
              name="accessLevel"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={defaultValues?.accessLevel || "user"}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accessLevel && (
              <p className="mt-1 text-sm text-red-600">{errors.accessLevel.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Institution: *</label>
            <Controller
              name="institutionId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={defaultValues?.institutionId || ""}
                  disabled={institutions.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst._id} value={inst._id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.institutionId && (
              <p className="mt-1 text-sm text-red-600">{errors.institutionId.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            className="w-full md:w-auto"
            disabled={institutions.length === 0}
          >
            {defaultValues?._id ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    );
  }