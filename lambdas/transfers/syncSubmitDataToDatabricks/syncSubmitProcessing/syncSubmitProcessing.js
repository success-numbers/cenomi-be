const AWS = require("aws-sdk");
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const s3 = new AWS.S3();

const utility = require('./utility');
const handler = async (event) => {
	console.log("Create Sync Submit Processing Lambda Incoming Event", JSON.stringify(event));
    const connectionString = process.env.BLOB_CONNECTION_STRING;
    const containerName = process.env.BLOB_CONTAINER;
	console.log("MEOW 1",connectionString, containerName,process.env.BLOB_PATH);
	try {
	  await Promise.all(event.Records.map(async (record) => {
		const recordBody = JSON.parse(record.body || '{}');
		let tsfSeqNo = recordBody?.tsfSeqNo;
		const mappedTsfItems = await utility.getAllTsfItemData(tsfSeqNo);
		console.log("Mapped TSF Items for DATABRICKS", JSON.stringify(mappedTsfItems));
		// const jsonString = JSON.stringify(mappedTsfItems, null, 2);
		const jsonString = mappedTsfItems.map(obj => JSON.stringify(obj)).join('\n');

		const putTimestamp = Date.now();
		const localFileName = `/tmp/${tsfSeqNo}_${putTimestamp}.json`;
		fs.writeFileSync(localFileName, jsonString);
		
		try {
			const blobName = `${process.env.BLOB_PATH}/${tsfSeqNo}_${putTimestamp}.json`;
			// Create a BlobServiceClient
			const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
	
			// Get a reference to a container
			const containerClient = blobServiceClient.getContainerClient(containerName);
	
			// Get a reference to a blob
			const blobClient = containerClient.getBlockBlobClient(blobName);
	
			// Upload the local JSON file to Azure Blob Storage
			await blobClient.uploadFile(localFileName);
	
			console.log(`JSON file '${localFileName}' uploaded to Azure Blob Storage as '${blobName}'.`);
		} finally {
			// Clean up: Delete the local file
			fs.unlinkSync(localFileName);
		}

	  }));
	  console.log("All Records Processed Successfully");
	} catch (e) {
	  console.log("Error Processing Records", e);
	  throw e;
	}
};
  
module.exports.handler = handler