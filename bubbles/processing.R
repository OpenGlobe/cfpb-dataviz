##PROCESS DATA ON DISPUTES
##Data can be found here: http://www.consumerfinance.gov/complaintdatabase/#download-the-data
##Specify packages
library(sqldf)

##Load in data
  setwd("/Users/jeffreychen/Google Drive/PIF - Other/013_CFPB_Workshop/raw_data")
  data <- read.csv("Consumer_Complaints.csv") 
  colnames(data)<-gsub("\\.","",colnames(data))
  
#Convert disputes into binary
  data$dispute<-0
  data$dispute[data$Consumerdisputed=="Yes"]<-1
  data$type <- paste(data$Subproduct,sep="")

#Calculate proportions
  processed <- sqldf("SELECT type, Companyresponsetoconsumer, AVG(dispute) pct_dispute
                     FROM data
                     GROUP BY type,Companyresponsetoconsumer")

#Remove dispositions that are not usable
  processed<-processed[which(processed$Companyresponsetoconsumer!="In progress" & 
                               processed$Companyresponsetoconsumer!="Untimely response"),]

#save CSV
  write.csv(processed,"bubble_processed.csv",row.names=F)
