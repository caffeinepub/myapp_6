import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";

module {
  type User = {
    username : Text;
    passwordHash : Text;
    displayName : Text;
    serialNumber : Nat;
    myBucksBalance : Nat;
    isBanned : Bool;
    banExpiryTimestamp : Int;
    displayNameLastChanged : Int;
    createdAt : Int;
  };

  type Message = {
    id : Nat;
    senderUsername : Text;
    recipientUsername : Text;
    text : Text;
    timestamp : Int;
    isRead : Bool;
  };

  // Call signaling types (future-proofed in migration)
  type CallType = { #voice; #video };
  type CallStatus = { #ringing; #accepted; #declined; #ended };
  type CallSession = {
    id : Text;
    callerUsername : Text;
    calleeUsername : Text;
    callType : CallType;
    status : CallStatus;
    sdpOffer : ?Text;
    sdpAnswer : ?Text;
    callerIceCandidates : [Text];
    calleeIceCandidates : [Text];
    startedAt : Int;
    answeredAt : Int;
    endedAt : Int;
  };

  type OldActor = {
    users : Map.Map<Text, User>;
    usersBySerial : Map.Map<Nat, Text>;
    principalToUsername : Map.Map<Principal, Text>;
    sessionTokenToUsername : Map.Map<Text, Text>;
    messages : Map.Map<Nat, Message>;
    nextSerialNumber : Nat;
    nextMessageId : Nat;
  };

  type NewActor = {
    users : Map.Map<Text, User>;
    usersBySerial : Map.Map<Nat, Text>;
    principalToUsername : Map.Map<Principal, Text>;
    sessionTokenToUsername : Map.Map<Text, Text>;
    messages : Map.Map<Nat, Message>;
    callSessions : Map.Map<Text, CallSession>;
    nextSerialNumber : Nat;
    nextMessageId : Nat;
    nextCallId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let emptyCallSessions = Map.empty<Text, CallSession>();

    {
      old with
      callSessions = emptyCallSessions; // Add empty callSessions map
      nextCallId = 1; // Initialize call ID counter
    };
  };
};
