"use client";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Study {
  _id: string;
  id: string;
  name: string;
  poNo: string | null;
  status: string;
  institution: { id: string; name: string; abbr: string };
}

interface DatasetFormPage1Props {
  studies: Study[];
  onSubmit: (data: unknown) => void;
}

export default function DatasetFormPage1({ studies, onSubmit }: DatasetFormPage1Props) {
  const { control, handleSubmit } = useFormContext();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <>
                <Input {...field} className="mt-1" />
                {fieldState.error && (
                  <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <Input {...field} className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Study</label>
          <Controller
            control={control}
            name="studyId"
            render={({ field, fieldState }) => (
              <>
                <Select {...field} onValueChange={field.onChange} value={field.value || ""}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select study" />
                  </SelectTrigger>
                  <SelectContent>
                    {studies.map((study) => (
                      <SelectItem key={study._id} value={study._id}>
                        {study.name} ({study.institution?.name || "N/A"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Brightfield TIFF</label>
          <Controller
            control={control}
            name="brightfield"
            render={({ field: { onChange } }) => (
              <Input type="file" accept=".tif,.tiff" onChange={(e) => onChange(e.target.files)} className="mt-1" />
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Fluorescent TIFF</label>
          <Controller
            control={control}
            name="fluorescent"
            render={({ field: { onChange } }) => (
              <Input type="file" accept=".tif,.tiff" onChange={(e) => onChange(e.target.files)} className="mt-1" />
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Alpha TIFF (required remove bg)</label>
          <Controller
            control={control}
            name="alpha"
            render={({ field: { onChange } }) => (
              <Input type="file" accept=".tif,.tiff" onChange={(e) => onChange(e.target.files)} className="mt-1" />
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Spacing</label>
          <Controller
            control={control}
            name="spacing"
            render={({ field }) => <Input {...field} className="mt-1" />}
          />  
        </div>
      </div>
      <Button type="submit">Submit</Button>
    </form>
  );
}