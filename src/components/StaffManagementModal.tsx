import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData } from '@/hooks/useBusinessData';
import { Loader2, UserPlus } from 'lucide-react';

interface StaffManagementModalProps {
  onStaffCreated: () => void;
  children: React.ReactNode;
}

const StaffManagementModal = ({ onStaffCreated, children }: StaffManagementModalProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { createStaffMember } = useBusinessData();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createStaffMember(name.trim(), email.trim());
      
      if (result.success) {
        toast({
          title: "Staff Member Added",
          description: `${name} has been added to your team. They will receive login instructions via email.`,
        });
        
        // Reset form
        setName('');
        setEmail('');
        setOpen(false);
        onStaffCreated();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to create staff member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Create a new inspector account for your business. They will receive login instructions via email.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staffName">Full Name</Label>
            <Input
              id="staffName"
              type="text"
              placeholder="Enter staff member's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="staffEmail">Email Address</Label>
            <Input
              id="staffEmail"
              type="email"
              placeholder="Enter staff member's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="bg-accent/20 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> The staff member will receive an email with instructions to set up their password.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Staff
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffManagementModal;