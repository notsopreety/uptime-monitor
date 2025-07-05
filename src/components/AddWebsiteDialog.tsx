import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(1, "Website name is required"),
  url: z.string().url("Please enter a valid URL"),
  check_interval: z.number().min(60, "Check interval must be at least 60 seconds"),
});

type FormData = z.infer<typeof formSchema>;

interface AddWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddWebsiteDialog = ({ open, onOpenChange, onSuccess }: AddWebsiteDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      url: "",
      check_interval: 300, // 5 minutes default
    },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add websites",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('websites')
        .insert({
          name: values.name,
          url: values.url,
          check_interval: values.check_interval,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Website added successfully",
        description: `${values.name} is now being monitored`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding website:', error);
      toast({
        title: "Error",
        description: "Failed to add website",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Website</DialogTitle>
          <DialogDescription>
            Add a new website to monitor its uptime status.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Website" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name for your website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The full URL to monitor (including https://)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="check_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check Interval</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often to check the website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Website"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};