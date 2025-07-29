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
    
    // Comprehensive validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Staff member name is required",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Validation Error", 
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Starting staff creation for:', { name: name.trim(), email: email.trim() });
      
      const result = await createStaffMember(name.trim(), email.trim());
      
      console.log('Staff creation result:', result);
      
      if (result.success) {
        toast({
          title: "✅ Staff Member Added Successfully",
          description: `${name} has been added to your team. They will receive an email to set up their password.`,
        });
        
        // Reset form
        setName('');
        setEmail('');
        setOpen(false);
        onStaffCreated();
      } else {
        // Handle specific error cases with detailed feedback
        let errorMessage = 'Failed to create staff member';
        let errorTitle = 'Staff Creation Failed';
        
        const errorMsg = result.error?.message || '';
        
        if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
          errorTitle = 'User Already Exists';
          errorMessage = `A user with email "${email}" already exists. Please use a different email address or check if this person is already in your team.`;
        } else if (errorMsg.includes('Invalid email')) {
          errorTitle = 'Invalid Email';
          errorMessage = 'The email address format is invalid. Please check and try again.';
        } else if (errorMsg.includes('Database error') || errorMsg.includes('trigger')) {
          errorTitle = 'Database Error';
          errorMessage = 'There was an issue with the database. Please try again in a moment or contact support if the problem persists.';
        } else if (errorMsg.includes('Unauthorized')) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to add staff members. Please ensure you are logged in as an admin.';
        } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
          errorTitle = 'Connection Error';
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorMsg) {
          errorMessage = errorMsg;
        }
        
        console.error('Staff creation failed:', { errorTitle, errorMessage, originalError: result.error });
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Unexpected error in staff creation:', error);
      
      let errorMessage = 'An unexpected error occurred while creating the staff member.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString().includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.';
      }
      
      toast({
        title: "Unexpected Error",
        description: errorMessage,
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