import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  type OldUser = {
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

  // Old actor state without notifications and sessionTokenToPrincipal
  type OldActor = {
    nextSerialNumber : Nat;
    nextMessageId : Nat;
    nextCallId : Nat;
    users : Map.Map<Text, OldUser>;
    usersBySerial : Map.Map<Nat, Text>;
    principalToUsername : Map.Map<Principal, Text>;
    sessionTokenToUsername : Map.Map<Text, Text>;
  };

  type NewUser = {
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

  type Notification = {
    id : Nat;
    recipientUsername : Text;
    text : Text;
    timestamp : Int;
    isRead : Bool;
  };

  // New actor state with notifications and sessionTokenToPrincipal
  type NewActor = {
    nextSerialNumber : Nat;
    nextMessageId : Nat;
    nextCallId : Nat;
    nextNotificationId : Nat;
    users : Map.Map<Text, NewUser>;
    usersBySerial : Map.Map<Nat, Text>;
    principalToUsername : Map.Map<Principal, Text>;
    sessionTokenToUsername : Map.Map<Text, Text>;
    sessionTokenToPrincipal : Map.Map<Text, Principal>;
    notifications : Map.Map<Nat, Notification>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      nextNotificationId = 1;
      sessionTokenToPrincipal = Map.empty<Text, Principal>();
      notifications = Map.empty<Nat, Notification>();
    };
  };
};
