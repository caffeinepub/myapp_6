import Text "mo:core/Text";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  // Persistent authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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

  public type Message = {
    id : Nat;
    senderUsername : Text;
    recipientUsername : Text;
    text : Text;
    timestamp : Int;
    isRead : Bool;
  };

  public type UserProfile = {
    username : Text;
    displayName : Text;
    serialNumber : Nat;
    myBucksBalance : Nat;
    isBanned : Bool;
    banExpiryTimestamp : Int;
  };

  public type ConversationSummary = {
    username : Text;
    lastMessage : ?Message;
  };

  type Conversation = {
    friend : Text;
    messages : [Message];
  };

  let users = Map.empty<Text, User>(); // username -> User
  let usersBySerial = Map.empty<Nat, Text>(); // serial -> username
  let principalToUsername = Map.empty<Principal, Text>(); // principal -> username
  let sessionTokenToUsername = Map.empty<Text, Text>(); // token -> username
  let messages = Map.empty<Nat, Message>(); // id -> Message

  var nextSerialNumber = 1;
  var nextMessageId = 1;

  // ====== HELPERS =====

  func getNextSerialNumber() : Nat {
    let serial = nextSerialNumber;
    nextSerialNumber += 1;
    serial;
  };

  func getNewMessageId() : Nat {
    let id = nextMessageId;
    nextMessageId += 1;
    id;
  };

  func getUser(username : Text) : User {
    switch (users.get(username)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };
  };

  func getUserBySerial(serial : Nat) : User {
    switch (usersBySerial.get(serial)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?username) { getUser(username) };
    };
  };

  func requireIsAdmin(caller: Principal, token : Text) {
    // First check if caller has admin role via AccessControl
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return;
    };

    // Fallback to session token check for "Ayaan" username
    switch (sessionTokenToUsername.get(token)) {
      case (null) { Runtime.trap("Unauthorized: Only admins can perform this action") };
      case (?username) {
        if (username != "Ayaan") {
          Runtime.trap("Unauthorized: Only admins can perform this action");
        };
      };
    };
  };

  func userToProfile(user : User) : UserProfile {
    {
      username = user.username;
      displayName = user.displayName;
      serialNumber = user.serialNumber;
      myBucksBalance = user.myBucksBalance;
      isBanned = user.isBanned;
      banExpiryTimestamp = user.banExpiryTimestamp;
    };
  };

  // ===== ACCOUNTS AND AUTH =====

  public shared ({ caller }) func registerWithToken(
    username : Text,
    passwordHash : Text,
    displayName : Text,
    sessionToken : Text,
  ) : async Nat {
    // Registration is open to all (including guests)
    if (users.containsKey(username)) {
      Runtime.trap("Username already exists");
    };

    let serial = getNextSerialNumber();
    let user : User = {
      username;
      passwordHash;
      displayName;
      serialNumber = serial;
      myBucksBalance = 0;
      isBanned = false;
      banExpiryTimestamp = 0;
      displayNameLastChanged = 0;
      createdAt = Time.now();
    };

    users.add(username, user);
    usersBySerial.add(serial, username);
    sessionTokenToUsername.add(sessionToken, username);
    principalToUsername.add(caller, username);
    
    // Assign user role in AccessControl system
    // Note: We can't call assignRole here as it requires admin permission
    // The user will have guest role until an admin upgrades them
    
    serial;
  };

  public shared ({ caller }) func loginWithToken(
    username : Text,
    passwordHash : Text,
    sessionToken : Text,
  ) : async UserProfile {
    // Login is open to all (including guests)
    let user = getUser(username);

    if (user.passwordHash != passwordHash) {
      Runtime.trap("Invalid credentials");
    };

    if (user.isBanned and Time.now() > user.banExpiryTimestamp) {
      let updatedUser = {
        user with isBanned = false;
        banExpiryTimestamp = 0;
      };
      users.add(username, updatedUser);
      sessionTokenToUsername.add(sessionToken, username);
      principalToUsername.add(caller, username);
      return userToProfile(updatedUser);
    };

    if (user.isBanned) {
      Runtime.trap(
        "User is banned until " # user.banExpiryTimestamp.toText()
      );
    };

    sessionTokenToUsername.add(sessionToken, username);
    principalToUsername.add(caller, username);
    userToProfile(user);
  };

  public shared ({ caller }) func logoutToken(sessionToken : Text) : async () {
    // Logout is open to all
    if (not sessionTokenToUsername.containsKey(sessionToken)) {
      Runtime.trap("Session token does not exist");
    };
    sessionTokenToUsername.remove(sessionToken);
  };

  func resolveUsername(caller : Principal, sessionToken : Text) : Text {
    switch (sessionTokenToUsername.get(sessionToken)) {
      case (?username) { username };
      case (null) {
        switch (principalToUsername.get(caller)) {
          case (null) { Runtime.trap("Not logged in") };
          case (?username) { username };
        };
      };
    };
  };

  // ===== LEGACY PROFILE FUNCTIONS =====

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Requires user role
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      // Allow fallback to session token system
      return null;
    };

    switch (principalToUsername.get(caller)) {
      case (null) { null };
      case (?username) {
        switch (users.get(username)) {
          case (null) { null };
          case (?user) {
            ?userToProfile(user);
          };
        };
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Admin can view any profile, users can only view their own
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };

    switch (principalToUsername.get(user)) {
      case (null) { null };
      case (?username) {
        switch (users.get(username)) {
          case (null) { null };
          case (?u) {
            ?userToProfile(u);
          };
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(_ : UserProfile) : async () {
    // Requires user role
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    Runtime.trap("Use specific update functions for profile changes");
  };

  // ===== PUBLIC PROFILE FUNCTIONS =====

  public query ({ caller }) func searchBySerial(serial : Nat) : async {
    displayName : Text;
    username : Text;
  } {
    // Public function - no authorization required
    let user = getUserBySerial(serial);
    {
      displayName = user.displayName;
      username = user.username;
    };
  };

  public query ({ caller }) func getUserProfileByUsername(
    username : Text
  ) : async UserProfile {
    // Public function - no authorization required
    let user = getUser(username);
    userToProfile(user);
  };

  // ===== MESSAGING =====

  public shared ({ caller }) func sendMessageWithToken(recipientUsername : Text, text : Text, token : Text) : async () {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      // Check if they have a valid session token
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can send messages");
      };
    };

    let senderUsername = resolveUsername(caller, token);
    let sender = getUser(senderUsername);

    if (sender.isBanned) {
      Runtime.trap("Cannot send messages while banned");
    };

    if (not users.containsKey(recipientUsername)) {
      Runtime.trap("Recipient does not exist");
    };

    let message : Message = {
      id = getNewMessageId();
      senderUsername;
      recipientUsername;
      text;
      timestamp = Time.now();
      isRead = false;
    };

    messages.add(message.id, message);
  };

  public query ({ caller }) func getConversationWithToken(
    otherUsername : Text,
    token : Text,
  ) : async [Message] {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can view conversations");
      };
    };

    let myUsername = resolveUsername(caller, token);

    let conversationMessages = messages.values().toArray().filter(
      func(message) {
        (message.senderUsername == myUsername and message.recipientUsername == otherUsername) or (message.senderUsername == otherUsername and message.recipientUsername == myUsername)
      }
    );

    conversationMessages.sort<Message>(
      func(a, b) { Int.compare(a.timestamp, b.timestamp) }
    );
  };

  public query ({ caller }) func getAllConversationsWithToken(token : Text) : async [ConversationSummary] {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can view conversations");
      };
    };

    let myUsername = resolveUsername(caller, token);

    let myMessages = messages.values().toArray().filter(
      func(message) {
        message.senderUsername == myUsername or message.recipientUsername == myUsername
      }
    );

    let conversationMap = Map.empty<Text, Message>();

    for (message in myMessages.vals()) {
      let otherUser = if (message.senderUsername == myUsername) {
        message.recipientUsername;
      } else {
        message.senderUsername;
      };

      switch (conversationMap.get(otherUser)) {
        case (null) {
          conversationMap.add(otherUser, message);
        };
        case (?existingMessage) {
          if (message.timestamp > existingMessage.timestamp) {
            conversationMap.add(otherUser, message);
          };
        };
      };
    };

    let summaries = conversationMap.entries().toArray().map(
      func((username, lastMessage)) {
        { username; lastMessage = ?lastMessage };
      }
    );

    summaries;
  };

  public shared ({ caller }) func markMessageAsReadWithToken(messageId : Nat, token : Text) : async () {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can mark messages as read");
      };
    };

    let myUsername = resolveUsername(caller, token);

    switch (messages.get(messageId)) {
      case (null) { Runtime.trap("Message does not exist") };
      case (?message) {
        if (message.recipientUsername != myUsername) {
          Runtime.trap("Can only mark your own messages as read");
        };
        let updatedMessage = {
          message with isRead = true;
        };
        messages.add(messageId, updatedMessage);
      };
    };
  };

  public query ({ caller }) func getUnreadMessageCountWithToken(token : Text) : async Nat {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can view unread count");
      };
    };

    let myUsername = resolveUsername(caller, token);

    let unreadMessages = messages.values().toArray().filter(
      func(message) {
        message.recipientUsername == myUsername and not message.isRead
      }
    );

    unreadMessages.size();
  };

  public query ({ caller }) func getLatestUnreadMessageSenderWithToken(token : Text) : async ?Text {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can view unread messages");
      };
    };

    let myUsername = resolveUsername(caller, token);

    let unreadMessages = messages.values().toArray().filter(
      func(message) {
        message.recipientUsername == myUsername and not message.isRead
      }
    );

    if (unreadMessages.size() == 0) {
      return null;
    };

    let sortedMessages = unreadMessages.sort(
      func(a, b) { Int.compare(b.timestamp, a.timestamp) }
    );

    ?sortedMessages[0].senderUsername;
  };

  // ===== MYBUCKS =====

  public query ({ caller }) func getMyBucksBalanceWithToken(token : Text) : async Nat {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can view balance");
      };
    };

    let myUsername = resolveUsername(caller, token);
    let user = getUser(myUsername);
    user.myBucksBalance;
  };

  // ===== SETTINGS =====

  public shared ({ caller }) func updateDisplayNameWithToken(
    newDisplayName : Text,
    token : Text,
  ) : async () {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can update display name");
      };
    };

    let myUsername = resolveUsername(caller, token);
    let user = getUser(myUsername);

    if (user.isBanned) {
      Runtime.trap("Cannot update display name while banned");
    };

    // Check 24-hour cooldown
    if (user.displayNameLastChanged != 0) {
      let cooldownPeriod : Int = 24 * 60 * 60 * 1000000000;
      if (Time.now() < user.displayNameLastChanged + cooldownPeriod) {
        Runtime.trap("Display name can only be changed once every 24 hours");
      };
    };

    let updatedUser = {
      user with
      displayName = newDisplayName;
      displayNameLastChanged = Time.now();
    };
    users.add(myUsername, updatedUser);
  };

  public shared ({ caller }) func updatePasswordWithToken(
    currentPasswordHash : Text,
    newPasswordHash : Text,
    token : Text,
  ) : async () {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can update password");
      };
    };

    let myUsername = resolveUsername(caller, token);
    let user = getUser(myUsername);

    if (user.passwordHash != currentPasswordHash) {
      Runtime.trap("Current password is incorrect");
    };

    let updatedUser = {
      user with passwordHash = newPasswordHash;
    };
    users.add(myUsername, updatedUser);
  };

  public shared ({ caller }) func updateUsernameWithToken(
    newUsername : Text,
    token : Text,
  ) : async () {
    // Requires user role or valid session token
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      if (not sessionTokenToUsername.containsKey(token)) {
        Runtime.trap("Unauthorized: Only users can update username");
      };
    };

    let oldUsername = resolveUsername(caller, token);

    if (users.containsKey(newUsername)) {
      Runtime.trap("Username already exists");
    };

    let user = getUser(oldUsername);

    if (user.myBucksBalance < 500) {
      Runtime.trap(
        "Insufficient MyBucks balance. Need 500 MyBucks to change username"
      );
    };

    let updatedUser = {
      user with
      username = newUsername;
      myBucksBalance = user.myBucksBalance - 500;
    };

    users.remove(oldUsername);
    users.add(newUsername, updatedUser);
    usersBySerial.add(user.serialNumber, newUsername);
    sessionTokenToUsername.add(token, newUsername);
    principalToUsername.add(caller, newUsername);

    // Update all messages
    for ((id, message) in messages.entries()) {
      var updated = false;
      var newMessage = message;

      if (message.senderUsername == oldUsername) {
        newMessage := { newMessage with senderUsername = newUsername };
        updated := true;
      };

      if (message.recipientUsername == oldUsername) {
        newMessage := { newMessage with recipientUsername = newUsername };
        updated := true;
      };

      if (updated) {
        messages.add(id, newMessage);
      };
    };
  };

  // ===== ADMIN ACTIONS =====

  public shared ({ caller }) func enhanceWithToken(serial : Nat, amount : Nat, token : Text) : async () {
    // Requires admin role
    requireIsAdmin(caller, token);

    let user = getUserBySerial(serial);
    let updatedUser = {
      user with myBucksBalance = user.myBucksBalance + amount;
    };
    users.add(user.username, updatedUser);
  };

  public shared ({ caller }) func terminateWithToken(
    serial : Nat,
    token : Text,
  ) : async () {
    // Requires admin role
    requireIsAdmin(caller, token);

    let user = getUserBySerial(serial);

    // Delete all messages involving this user
    let messagesToDelete = messages.entries().toArray().filter(
      func((id, message)) {
        message.senderUsername == user.username or message.recipientUsername == user.username
      }
    );

    for ((id, _) in messagesToDelete.vals()) {
      messages.remove(id);
    };

    // Delete user
    users.remove(user.username);
    usersBySerial.remove(serial);

    // Clean up session tokens
    let tokensToDelete = sessionTokenToUsername.entries().toArray().filter(
      func((token, username)) { username == user.username }
    );

    for ((token, _) in tokensToDelete.vals()) {
      sessionTokenToUsername.remove(token);
    };

    // Clean up principal mapping
    let principalsToDelete = principalToUsername.entries().toArray().filter(
      func((p, username)) { username == user.username }
    );

    for ((p, _) in principalsToDelete.vals()) {
      principalToUsername.remove(p);
    };
  };

  public shared ({ caller }) func banWithToken(
    serial : Nat,
    days : Nat,
    token : Text,
  ) : async () {
    // Requires admin role
    requireIsAdmin(caller, token);

    let user = getUserBySerial(serial);
    let banDuration : Int = days * 24 * 60 * 60 * 1000000000;
    let updatedUser = {
      user with
      isBanned = true;
      banExpiryTimestamp = Time.now() + banDuration;
    };
    users.add(user.username, updatedUser);
  };

  public shared ({ caller }) func unbanWithToken(serial : Nat, token : Text) : async () {
    // Requires admin role
    requireIsAdmin(caller, token);

    let user = getUserBySerial(serial);
    let updatedUser = {
      user with
      isBanned = false;
      banExpiryTimestamp = 0;
    };
    users.add(user.username, updatedUser);
  };
};
