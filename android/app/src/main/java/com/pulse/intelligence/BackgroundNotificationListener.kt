package com.pulse.intelligence

import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue

class BackgroundNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // Exclude system notifications or our own app to prevent loops
        if (packageName == "android" || packageName == "com.pulse.intelligence") return

        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title.isNotEmpty() && text.isNotEmpty()) {
            Log.d("PulseIntelligence", "Intercepted from $packageName: $title")

            // Get userId from SharedPreferences (stored by the Web App)
            val sharedPrefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val userId = sharedPrefs.getString("userId", null)

            if (userId == null) {
                Log.e("PulseIntelligence", "No userId found in storage. Cannot sync to cloud.")
                return
            }

            val notificationData = hashMapOf(
                "appName" to (getPackageManager()?.getApplicationLabel(getPackageManager().getApplicationInfo(packageName, 0)) ?: packageName),
                "titleText" to title,
                "body" to text,
                "persona" to "Native Listener",
                "summary" to "Imported from Android notifications.", 
                "category" to "Imported",
                "priority" to "LOW",
                "userId" to userId,
                "createdAt" to FieldValue.serverTimestamp()
            )

            try {
                FirebaseFirestore.getInstance()
                    .collection("users")
                    .document(userId)
                    .collection("notifications")
                    .add(notificationData)
                    .addOnSuccessListener { Log.d("PulseIntelligence", "Notification synced to Cloud Firestore") }
                    .addOnFailureListener { e -> Log.e("PulseIntelligence", "Firebase Sync Failed", e) }
            } catch (e: Exception) {
                Log.e("PulseIntelligence", "Firebase possibly not initialized: ${e.message}")
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {}
}
