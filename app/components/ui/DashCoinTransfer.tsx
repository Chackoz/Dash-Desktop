import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { UserPoints } from "@/app/types/types";
import { 
  ref, 
  runTransaction, 
  serverTimestamp 
} from "firebase/database";
import { firebaseService } from "@/app/services/firebase";

interface DashCoinTransferProps {
  userPoints: UserPoints;
  userId: string;
}

export const DashCoinTransfer: React.FC<DashCoinTransferProps> = ({ 
  userPoints, 
  userId 
}) => {
  const [recipientId, setRecipientId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  const handleTransfer = async () => {
    // Reset previous errors
    setTransferError("");
    
    // Validate inputs
    const amount = parseInt(transferAmount);
    if (!recipientId) {
      setTransferError("Recipient ID is required");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Invalid transfer amount");
      return;
    }
    if (amount > userPoints.totalPoints) {
      setTransferError("Insufficient DASH Coins");
      return;
    }

    // Prevent transferring to self
    if (recipientId === userId) {
      setTransferError("Cannot transfer to yourself");
      return;
    }

    try {
      setIsTransferring(true);
      const database = firebaseService.database;
      
      if (!database) {
        throw new Error("Database not initialized");
      }

      // Reference to the current user's points
      const currentUserPointsRef = ref(
        database, 
        `userPoints/${userId}`
      );

      // Reference to the recipient's points
      const recipientPointsRef = ref(
        database, 
        `userPoints/${recipientId}`
      );

      // Transaction to update points
      await runTransaction(currentUserPointsRef, (currentData) => {
        if (currentData) {
          if (currentData.totalPoints >= amount) {
            currentData.totalPoints -= amount;
            currentData.lastUpdated = serverTimestamp();
            return currentData;
          } else {
            return; // Abort the transaction
          }
        }
        return; // Abort if no current data
      });

      // Add points to recipient
      await runTransaction(recipientPointsRef, (recipientData) => {
        if (recipientData) {
          recipientData.totalPoints = (recipientData.totalPoints || 0) + amount;
          recipientData.lastUpdated = serverTimestamp();
          return recipientData;
        }
        // If no existing data, create new entry
        return { 
          totalPoints: amount, 
          lastUpdated: serverTimestamp()
        };
      });

    

      // Reset form
      setRecipientId("");
      setTransferAmount("");
      setIsTransferring(false);
    } catch (error) {
      console.error("Transfer failed", error);
      setTransferError("Transfer failed. Please try again.");
      setIsTransferring(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Send className="mr-2 h-4 w-4" />
          Transfer DASH Coins
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer DASH Coins</DialogTitle>
          <DialogDescription>
            Send DASH Coins to another user in the network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipientId" className="text-right">
              Recipient ID
            </Label>
            <Input
              id="recipientId"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Enter recipient's User ID"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Enter DASH Coins to transfer"
              className="col-span-3"
              max={userPoints.totalPoints}
            />
          </div>
          {transferError && (
            <div className="text-red-500 text-sm text-center">
              {transferError}
            </div>
          )}
          <div className="text-sm text-muted-foreground text-center">
            Available Balance: {userPoints.totalPoints} DASH Coins
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleTransfer} 
            disabled={isTransferring}
          >
            {isTransferring ? "Transferring..." : "Transfer Coins"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};