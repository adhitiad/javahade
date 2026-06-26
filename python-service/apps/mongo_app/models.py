from djongo import models

class UserActivityLog(models.Model):
    user_id = models.CharField(max_length=100)
    activity_type = models.CharField(max_length=50)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict)
    
    class Meta:
        app_label = 'mongo_app'
        db_table = 'user_activity_logs'

    def __str__(self):
        return f"{self.user_id} - {self.activity_type}"
